// Chạy migration StagingID + Staging_CustomColumns (idempotent) qua node
(async () => {
  const { poolPromise } = require('D:/faca-library/faca-library-backend/src/config/db');
  const pool = await poolPromise;

  // 1. Thêm StagingID vào từng bảng staging nếu chưa có
  const tables = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE 'Staging_%' AND name != 'Staging_CustomColumns'");
  for (const t of tables.recordset) {
    const chk = await pool.request()
      .input('T', t.name)
      .query("SELECT COUNT(*) AS Cnt FROM sys.columns WHERE object_id = OBJECT_ID('dbo.' + @T) AND name = 'StagingID'");
    if (chk.recordset[0].Cnt === 0) {
      await pool.request().query(`ALTER TABLE dbo.[${t.name}] ADD StagingID BIGINT IDENTITY(1,1);`);
      console.log('Đã thêm StagingID:', t.name);
    } else {
      console.log('Đã có StagingID:', t.name);
    }
  }

  // 2. Bảng metadata cột mở rộng
  const meta = await pool.request().query("SELECT COUNT(*) AS Cnt FROM sys.tables WHERE name = 'Staging_CustomColumns'");
  if (meta.recordset[0].Cnt === 0) {
    await pool.request().query(`
      CREATE TABLE dbo.Staging_CustomColumns (
        CustomColumnId INT IDENTITY(1,1) PRIMARY KEY,
        SourceKey      NVARCHAR(30)  NOT NULL,
        ColumnName     NVARCHAR(100) NOT NULL,
        Label          NVARCHAR(200) NULL,
        DataType       NVARCHAR(20)  NOT NULL CONSTRAINT DF_StagingCustomColumns_DataType DEFAULT (N'NVARCHAR(255)'),
        CreatedAt      DATETIME2     NOT NULL CONSTRAINT DF_StagingCustomColumns_CreatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_StagingCustomColumns_Source_Col UNIQUE (SourceKey, ColumnName)
      );`);
    console.log('Đã tạo bảng Staging_CustomColumns');
  } else {
    console.log('Đã có bảng Staging_CustomColumns');
  }

  console.log('>>> MIGRATION HOÀN TẤT');
  process.exit(0);
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
