const { sql, poolPromise } = require('../config/db');

async function getPool() {
  return poolPromise;
}

const getMaterials = async (req, res) => {

  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';

    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const offset = (page - 1) * limit;
    const pool = await getPool();
    const searchSql = search
      ? ' AND (m.MaterialName LIKE @search OR m.Description LIKE @search OR m.Config LIKE @search)'

      : '';

    const countSql = 'SELECT COUNT(*) AS TotalCount FROM dbo.Materials m WHERE 1=1' + searchSql;
    const countReq = pool.request().input('search', sql.NVarChar(255), '%' + search + '%');
    const countResult = await countReq.query(countSql);
    const totalCount = (countResult.recordset[0] && countResult.recordset[0].TotalCount) || 0;

    const dataSql = `
      SELECT
        m.MaterialID,
        m.MaterialName,
        m.Description,
        m.Config,
        m.MaterialTypeID,
        m.VendorID,
        m.CreatedDate,
        v.VendorName,
        mt.MaterialTypeName
      FROM dbo.Materials m
      LEFT JOIN dbo.Vendors v ON v.VendorID = m.VendorID
      LEFT JOIN dbo.MaterialTypes mt ON mt.MaterialTypeID = m.MaterialTypeID
      WHERE 1=1${searchSql}
      ORDER BY m.MaterialName
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`




    const dataReq = pool.request()
      .input('search', sql.NVarChar(255), '%' + search + '%')
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit);

    const dataResult = await dataReq.query(dataSql);

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit) || 1),
      },
    });

  } catch (error) {

    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách vật liệu: ' + error.message,
    });
  }
};

/**
 * GET /api/inventory-lots
 * Query: page, limit, search
 */

const getInventoryLotsPaginated = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';

    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const offset = (page - 1) * limit;
    const pool = await getPool();
    const searchSql = search
      ? ' AND (il.LotCode LIKE @search OR p.ProjectName LIKE @search OR p.ProjectCode LIKE @search OR b.BuildCode LIKE @search OR m.MaterialName LIKE @search OR CAST(il.StockQty AS NVARCHAR(50)) LIKE @search OR CAST(il.ShipmentQty AS NVARCHAR(50)) LIKE @search)'

      : '';
      
    const countSql = 'SELECT COUNT(*) AS TotalCount FROM dbo.InventoryLots il INNER JOIN dbo.Projects p ON p.ProjectID = il.ProjectID INNER JOIN dbo.Builds b ON b.BuildID = il.BuildID INNER JOIN dbo.Materials m ON m.MaterialID = il.MaterialID WHERE 1=1' + searchSql;
    const countReq = pool.request().input('search', sql.NVarChar(255), '%' + search + '%');
    const countResult = await countReq.query(countSql);
    const totalCount = (countResult.recordset[0] && countResult.recordset[0].TotalCount) || 0;

    const dataSql = `
      SELECT
        il.InventoryLotID,
        il.LotCode,
        il.ReceiveDate,
        il.ShipmentQty,
        il.StockQty,
        il.IQAScrapQty,
        il.DRI,
        il.BillNo,
        il.InvoiceNo,
        il.Remark,
        il.CreatedDate,
        p.ProjectID,
        p.ProjectCode,
        p.ProjectName,
        b.BuildID,
        b.BuildCode,
        m.MaterialID,
        m.MaterialName,
        m.Description AS MaterialDescription
      FROM dbo.InventoryLots il
      INNER JOIN dbo.Projects p ON p.ProjectID = il.ProjectID
      INNER JOIN dbo.Builds b ON b.BuildID = il.BuildID
      INNER JOIN dbo.Materials m ON m.MaterialID = il.MaterialID
      WHERE 1=1${searchSql}
      ORDER BY il.LotCode
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`


    const dataReq = pool.request()
      .input('search', sql.NVarChar(255), '%' + search + '%')
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit);

    const dataResult = await dataReq.query(dataSql);
    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit) || 1),
      },
    });

  } catch (error) {
    console.error('Error fetching inventory lots:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách kho: ' + error.message,
    });
  }
};

/**
 * GET /api/projects
 * Query: page, limit, search
 */
const getProjectsPaginated = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';

    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const offset = (page - 1) * limit;

    const pool = await getPool();
    const searchSql = search
      ? ' AND (ProjectCode LIKE @search OR ProjectName LIKE @search)'
      : '';

    const countSql = 'SELECT COUNT(*) AS TotalCount FROM dbo.Projects WHERE 1=1' + searchSql;
    const countReq = pool.request().input('search', sql.NVarChar(255), '%' + search + '%');
    const countResult = await countReq.query(countSql);
    const totalCount = (countResult.recordset[0] && countResult.recordset[0].TotalCount) || 0;

    const dataSql = `
      SELECT ProjectID, ProjectCode, ProjectName, CreatedDate
      FROM dbo.Projects
      WHERE 1=1${searchSql}
      ORDER BY ProjectCode
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`

    const dataReq = pool.request()
      .input('search', sql.NVarChar(255), '%' + search + '%')
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit);

    const dataResult = await dataReq.query(dataSql);
    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit) || 1),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách dự án: ' + error.message,
    });
  }
};

/**
 * GET /api/warehouse/vendors
 * Paginated vendors list with optional search.
 */

const getVendorsPaginated = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';

    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const offset = (page - 1) * limit;

    const pool = await getPool();
    const searchSql = search
      ? ' AND (VendorName LIKE @search OR Country LIKE @search)'
      : '';


    const countSql = 'SELECT COUNT(*) AS TotalCount FROM dbo.Vendors WHERE 1=1' + searchSql;
    const countReq = pool.request().input('search', sql.NVarChar(255), '%' + search + '%');
    const countResult = await countReq.query(countSql);
    const totalCount = (countResult.recordset[0] && countResult.recordset[0].TotalCount) || 0;

    const dataSql = `
      SELECT VendorID, VendorName, Country, ContactName, Phone, Email, IsActive, CreatedDate
      FROM dbo.Vendors
      WHERE 1=1${searchSql}
      ORDER BY VendorName
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`

    const dataReq = pool.request()
      .input('search', sql.NVarChar(255), '%' + search + '%')
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit);

    const dataResult = await dataReq.query(dataSql);
    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit) || 1),
      },
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách nhà cung cấp: ' + error.message,
    });
  }
};

/**
 * GET /api/warehouse/builds
 * Paginated builds list with optional search.
 */

const getBuildsPaginated = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    const search = req.query.search || '';

    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.max(1, Math.min(100, isNaN(limit) ? 20 : limit));
    const offset = (page - 1) * limit;

    const pool = await getPool();
    const searchSql = search
      ? ' AND (b.BuildCode LIKE @search OR p.ProjectName LIKE @search OR p.ProjectCode LIKE @search)'
      : '';

    const countSql = 'SELECT COUNT(*) AS TotalCount FROM dbo.Builds b INNER JOIN dbo.Projects p ON p.ProjectID = b.ProjectID WHERE 1=1' + searchSql;
    const countReq = pool.request().input('search', sql.NVarChar(255), '%' + search + '%');
    const countResult = await countReq.query(countSql);
    const totalCount = (countResult.recordset[0] && countResult.recordset[0].TotalCount) || 0;

    const dataSql = `
      SELECT b.BuildID, b.BuildCode, b.BuildName, b.ProjectID, p.ProjectCode, p.ProjectName
      FROM dbo.Builds b
      INNER JOIN dbo.Projects p ON p.ProjectID = b.ProjectID
      WHERE 1=1${searchSql}
      ORDER BY b.BuildCode
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;`

    const dataReq = pool.request()
      .input('search', sql.NVarChar(255), '%' + search + '%')
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit);

    const dataResult = await dataReq.query(dataSql);
    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit) || 1),
      },
    });

  } catch (error) {
    console.error('Error fetching builds:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách build: ' + error.message,
    });
  }
};

module.exports = {
  getMaterials,
  getInventoryLotsPaginated,
  getProjectsPaginated,
  getVendorsPaginated,
  getBuildsPaginated,
};

