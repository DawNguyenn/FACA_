/**
 * slideIndexer.js - Doc & luu chi muc noi dung tung slide .pptx.
 * Khong dung Graph Admin - chi doc file local (OneDrive sync) offline.
 * Thu vien: pizzip + @xmldom/xmldom. Slide 1 = wdSlideIndex=1.
 */
const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');
const { poolPromise, sql } = require('../config/db');

const MAX_SLIDE_TEXT_LENGTH = 8000;

const ensureSlideIndexesTable = async (pool) => {
    await pool.request().query(`
        IF OBJECT_ID('dbo.SlideIndexes', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.SlideIndexes (
                IndexId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SlideIndexes PRIMARY KEY,
                FileId NVARCHAR(255) NOT NULL,
                FileName NVARCHAR(255) NOT NULL,
                SharePointEmbedUrl NVARCHAR(MAX) NOT NULL,
                SlideIndex INT NOT NULL,
                SlideText NVARCHAR(MAX) NOT NULL,
                LastScannedAt DATETIME NOT NULL CONSTRAINT DF_SlideIndexes_LastScannedAt DEFAULT (GETDATE())
            );
            CREATE UNIQUE INDEX UX_SlideIndexes_File_Slide ON dbo.SlideIndexes (FileId, SlideIndex);
        END
    `);
};

/** Lay toan bo text trong 1 slide XML (<a:t> ke ca text trong bang/shape). */
const extractTextFromSlideXml = (xmlString) => {
    const xml = String(xmlString || '');
    try {
        const doc = new DOMParser({ onError: () => {} }).parseFromString(xml, 'text/xml');
        const nodes = doc.getElementsByTagName('a:t');
        const parts = [];
        for (let i = 0; i < nodes.length; i += 1) {
            const text = nodes[i] && nodes[i].textContent ? String(nodes[i].textContent).trim() : '';
            if (text) parts.push(text);
        }
        if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').trim();
    } catch { /* fallback regex ben duoi */ }
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    return matches
        .map((m) => m.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/** Doc file .pptx -> [{ slideIndex: 1, content: '...' }]. Nem loi neu file hong/bi khoa. */
const extractSlidesFromPPTX = async (filePath) => {
    let buffer;
    try {
        buffer = fs.readFileSync(filePath);
    } catch (error) {
        throw new Error(`Khong doc duoc file (co the bi khoa): ${error.message}`);
    }
    let zip;
    try {
        zip = new PizZip(buffer);
    } catch (error) {
        throw new Error(`File khong phai .pptx hop le hoac da hong: ${error.message}`);
    }
    let ordered = [];
    try {
        const presFile = zip.file('ppt/presentation.xml');
        const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
        if (presFile && relsFile) {
            const presXml = presFile.asText();
            const relsXml = relsFile.asText();
            const idOrder = [...presXml.matchAll(/r:id="([^"]+)"/g)].map((m) => m[1]);
            const relMap = {};
            [...relsXml.matchAll(/<Relationship[^>]*>/g)].forEach((m) => {
                const id = (m[0].match(/Id="([^"]+)"/) || [])[1];
                const target = (m[0].match(/Target="([^"]+)"/) || [])[1];
                if (id && target) relMap[id] = target;
            });
            for (const rId of idOrder) {
                const target = relMap[rId];
                if (target && /slides?\/slide/i.test(target)) {
                    ordered.push(target.startsWith('ppt/') ? target : `ppt/${String(target).replace(/^\//, '')}`);
                }
            }
        }
    } catch (error) {
        console.warn(`  Khong doc duoc thu tu slide, dung fallback: ${error.message}`);
        ordered = [];
    }
    if (ordered.length === 0) {
        ordered = Object.keys(zip.files)
            .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
            .sort((a, b) => parseInt(a.match(/slide(\d+)\.xml/)[1], 10) - parseInt(b.match(/slide(\d+)\.xml/)[1], 10));
    }
    const slides = [];
    ordered.forEach((slidePath, pos) => {
        const slideIndex = pos + 1;
        try {
            const f = zip.file(slidePath);
            if (!f) return;
            const content = extractTextFromSlideXml(f.asText());
            if (content) slides.push({ slideIndex, content });
        } catch (error) {
            console.warn(`  Bo qua slide ${slideIndex}: ${error.message}`);
        }
    });
    return slides;
};

/** Doc 1 file .pptx va luu chi muc tung slide (xoa cu -> insert moi). */
const processAndIndexPPTX = async (filePath, fileMetadata = {}) => {
    const pool = await poolPromise;
    await ensureSlideIndexesTable(pool);
    const fileId = String(fileMetadata.fileId || filePath).slice(0, 255);
    const fileName = String(fileMetadata.fileName || String(filePath).split(/[\\/]/).pop() || 'unknown.pptx').slice(0, 255);
    const embedUrl = String(fileMetadata.sharePointEmbedUrl || '');
    let slides = [];
    try {
        slides = await extractSlidesFromPPTX(filePath);
    } catch (error) {
        await pool.request().input('fileId', sql.NVarChar(255), fileId)
            .query('DELETE FROM dbo.SlideIndexes WHERE FileId = @fileId');
        throw error;
    }
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
        const del = new sql.Request(tx);
        del.input('fileId', sql.NVarChar(255), fileId);
        await del.query('DELETE FROM dbo.SlideIndexes WHERE FileId = @fileId');
        for (const s of slides) {
            const ins = new sql.Request(tx);
            ins.input('fileId', sql.NVarChar(255), fileId);
            ins.input('fileName', sql.NVarChar(255), fileName);
            ins.input('embedUrl', sql.NVarChar(sql.MAX), embedUrl);
            ins.input('slideIndex', sql.Int, s.slideIndex);
            ins.input('slideText', sql.NVarChar(sql.MAX), String(s.content).slice(0, MAX_SLIDE_TEXT_LENGTH));
            await ins.query(`INSERT INTO dbo.SlideIndexes
                (FileId, FileName, SharePointEmbedUrl, SlideIndex, SlideText, LastScannedAt)
                VALUES (@fileId, @fileName, @embedUrl, @slideIndex, @slideText, GETDATE());`);
        }
        await tx.commit();
    } catch (error) {
        try { await tx.rollback(); } catch { /* bo qua */ }
        throw error;
    }
    return { slideCount: slides.length, fileId };
};

module.exports = { extractSlidesFromPPTX, processAndIndexPPTX, ensureSlideIndexesTable, MAX_SLIDE_TEXT_LENGTH };