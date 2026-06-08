const xlsx = require("xlsx");

const MAX_ROWS = 10000;
const ALLOWED_TYPES = new Set(["laptop", "desktop", "monitor", "printer", "network_device"]);
const ALLOWED_STATUS = new Set(["available", "reserved", "assigned", "maintenance", "retired"]);

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanText(value, maxLength = 255) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();

  if (!text) return "";
  return text.slice(0, maxLength);
}

function normalizeType(value) {
  const input = cleanText(value, 50).toLowerCase().replace(/[\s-]+/g, "_");
  if (input === "networkdevice") return "network_device";
  return input;
}

function normalizeStatus(value) {
  const input = cleanText(value, 30).toLowerCase().replace(/[\s-]+/g, "_");
  return input || "available";
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(Number(serial) - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function safeToIsoDate(value) {
  if (!(value instanceof Date)) return "";
  const time = value.getTime();
  if (!Number.isFinite(time) || Number.isNaN(time)) return "";
  try {
    return value.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function normalizeDate(value) {
  if (value == null || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return safeToIsoDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = excelSerialToDate(value);
    return safeToIsoDate(date);
  }

  const text = cleanText(value, 50);
  if (!text) return "";

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return safeToIsoDate(parsed);
  }

  const ddmmyyyy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const normalized = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? "" : normalized;
  }

  return "";
}

function parseCost(value) {
  if (value == null || value === "") return null;
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric)) return NaN;
  return numeric;
}

function parseWarrantyMonths(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  const numeric = Number(raw.replace(/[^0-9.\-]/g, "").trim());
  if (!Number.isFinite(numeric)) return NaN;

  // Interpret values like "2 years", "2yr", "1y" as years.
  if (/year|years|yr|yrs|\by\b|\dy$/.test(raw)) {
    const months = Math.round(numeric * 12);
    return months >= 0 ? months : NaN;
  }

  // Interpret values like "12m", "12mo", "12mon", "12months" as months.
  if (/month|months|\bmo\b|\bmon\b|\bm\b|\dm$/.test(raw)) {
    const months = Math.round(numeric);
    return months >= 0 ? months : NaN;
  }

  // Default unit is months for plain numeric values like "24".
  const months = Math.round(numeric);
  return months >= 0 ? months : NaN;
}

function addMonthsToIsoDate(isoDate, monthsToAdd) {
  if (!isoDate || !Number.isInteger(monthsToAdd)) return "";

  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) return "";

  // Guard against extreme values that can overflow JS Date operations.
  if (monthsToAdd < 0 || monthsToAdd > 1200) return "";

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  if (!Number.isFinite(firstOfMonth.getTime()) || Number.isNaN(firstOfMonth.getTime())) return "";
  firstOfMonth.setUTCMonth(firstOfMonth.getUTCMonth() + monthsToAdd);
  if (!Number.isFinite(firstOfMonth.getTime()) || Number.isNaN(firstOfMonth.getTime())) return "";

  const lastDay = new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() + 1, 0)).getUTCDate();
  firstOfMonth.setUTCDate(Math.min(day, lastDay));

  return safeToIsoDate(firstOfMonth);
}

function getCell(row, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      return row[alias];
    }
  }
  return "";
}

function getCellByIncludes(row, matcher) {
  const keys = Object.keys(row || {});
  const key = keys.find((item) => matcher(item));
  return key ? row[key] : "";
}

function hasWarrantyWord(key) {
  return key.includes("warranty") || key.includes("warrenty") || key.includes("waranty") || key.includes("guarantee");
}

function loadRowsFromFile(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: true });

  return rows.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value;
    });
    return normalized;
  });
}

function mapRowToAsset(row) {
  const assetTag = cleanText(getCell(row, ["id", "assetid", "assettag", "assetmodelno"]), 50);
  const name = cleanText(getCell(row, ["name", "assetname"]), 180);
  const type = normalizeType(getCell(row, ["type", "category"]));
  const status = normalizeStatus(getCell(row, ["status", "assetstatus"]));
  const location = cleanText(getCell(row, ["location"]), 120);
  const purchaseDate = normalizeDate(getCell(row, ["purchasedate", "dateofpurchase"]));
  const fuzzyWarrantyDate = getCellByIncludes(
    row,
    (key) => hasWarrantyWord(key) && (key.includes("expiry") || key.includes("exp") || key.includes("date") || key.includes("end"))
  );
  const warrantyRaw = getCell(row, ["warrantyexpiry", "warranty", "warrantydate", "dateofwarranty", "warrantyperiod", "warrantyduration", "warrantytenure"]) || fuzzyWarrantyDate;
  const explicitWarrantyExpiry = normalizeDate(warrantyRaw);
  const explicitWarrantyYearValue = getCell(row, ["warrantyinyear", "warrantyyears", "warrantyyear", "warrentyinyear", "warantyinyear"]);
  const fuzzyWarrantyDuration = getCellByIncludes(
    row,
    (key) => hasWarrantyWord(key) && (key.includes("month") || key.includes("year") || key.includes("tenure") || key.includes("duration") || key.includes("period"))
  );
  const warrantyMonths = parseWarrantyMonths(
    getCell(row, ["warrantyinmonth", "warrantymonths", "warrantyinmonths", "warrantymonth", "warrantymonths", "warrentyinmonth", "warantyinmonth"]) ||
      (explicitWarrantyYearValue != null && explicitWarrantyYearValue !== "" ? `${explicitWarrantyYearValue} years` : "") ||
      fuzzyWarrantyDuration ||
      warrantyRaw
  );
  const derivedWarrantyExpiry = !Number.isNaN(warrantyMonths) && warrantyMonths != null
    ? addMonthsToIsoDate(purchaseDate, warrantyMonths)
    : "";
  const fallbackWarrantyExpiry = purchaseDate ? addMonthsToIsoDate(purchaseDate, 12) : "";
  const warrantyExpiry = explicitWarrantyExpiry || derivedWarrantyExpiry || fallbackWarrantyExpiry;
  const specs = cleanText(getCell(row, ["specs", "description", "note"]), 2000);
  const cost = parseCost(getCell(row, ["cost", "price", "unitprice", "unitcost"]));

  return {
    assetTag,
    name,
    type,
    status,
    location,
    purchaseDate,
    warrantyExpiry,
    specs,
    cost,
  };
}

function validateRows(rawRows) {
  const preparedRows = [];
  const failures = [];
  const seenInFile = new Set();

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = mapRowToAsset(rawRow);
    const rowFailures = [];

    if (!row.assetTag) rowFailures.push({ field: "assetTag", message: "Asset ID is required" });
    if (!row.name) rowFailures.push({ field: "name", message: "Name is required" });
    if (!row.type) rowFailures.push({ field: "type", message: "Type is required" });
    if (!row.location) rowFailures.push({ field: "location", message: "Location is required" });
    if (!row.purchaseDate) rowFailures.push({ field: "purchaseDate", message: "Purchase date is required or invalid" });
    if (!row.warrantyExpiry) rowFailures.push({ field: "warrantyExpiry", message: "Warranty expiry is required or invalid" });

    if (row.type && !ALLOWED_TYPES.has(row.type)) {
      rowFailures.push({ field: "type", message: "Type must be one of laptop, desktop, monitor, printer, network_device" });
    }

    if (row.status && !ALLOWED_STATUS.has(row.status)) {
      rowFailures.push({ field: "status", message: "Status must be one of available, reserved, assigned, maintenance, retired" });
    }

    if (row.purchaseDate && row.warrantyExpiry && row.warrantyExpiry < row.purchaseDate) {
      rowFailures.push({ field: "warrantyExpiry", message: "Warranty expiry must be on or after purchase date" });
    }

    if (Number.isNaN(row.cost)) {
      rowFailures.push({ field: "cost", message: "Cost must be numeric" });
    }

    if (row.cost != null && !Number.isNaN(row.cost) && row.cost < 0) {
      rowFailures.push({ field: "cost", message: "Cost must be non-negative" });
    }

    if (row.assetTag) {
      const normalizedTag = row.assetTag.toLowerCase();
      if (seenInFile.has(normalizedTag)) {
        rowFailures.push({ field: "assetTag", message: "Duplicate asset ID found in file" });
      } else {
        seenInFile.add(normalizedTag);
      }
    }

    if (rowFailures.length) {
      rowFailures.forEach((entry) => {
        failures.push({ rowNumber, assetTag: row.assetTag || "", field: entry.field, message: entry.message });
      });
      return;
    }

    preparedRows.push({ rowNumber, ...row });
  });

  return { preparedRows, failures };
}

async function getExistingAssetTags(client, assetTags) {
  if (!assetTags.length) return new Set();

  const result = await client.query(
    `SELECT asset_tag FROM assets WHERE LOWER(asset_tag) = ANY($1::text[])`,
    [assetTags.map((tag) => tag.toLowerCase())]
  );

  return new Set(result.rows.map((row) => String(row.asset_tag).toLowerCase()));
}

async function ensureUploadLogTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS asset_bulk_upload_logs (
      id SERIAL PRIMARY KEY,
      uploaded_by INTEGER REFERENCES users(id),
      uploader_email VARCHAR(180),
      file_name VARCHAR(255) NOT NULL,
      total_rows INTEGER NOT NULL,
      successful_rows INTEGER NOT NULL,
      failed_rows INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function buildErrorReportCsv(failures) {
  const header = ["Row Number", "Asset ID", "Field", "Error"];
  const lines = [header, ...failures.map((item) => [item.rowNumber, item.assetTag || "", item.field, item.message])];

  return lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

async function insertValidAssets(client, rows) {
  if (!rows.length) return { insertedCount: 0, insertedTags: new Set() };

  const values = [];
  const placeholders = rows.map((row, index) => {
    const start = index * 8;
    values.push(
      row.assetTag,
      row.name,
      row.type,
      row.status || "available",
      row.purchaseDate,
      row.warrantyExpiry,
      row.location,
      row.specs || null
    );

    return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}, $${start + 8})`;
  });

  const result = await client.query(
    `
    INSERT INTO assets
      (asset_tag, name, type, status, purchase_date, warranty_expiry, location, specs)
    VALUES
      ${placeholders.join(",")}
    ON CONFLICT (asset_tag) DO NOTHING
    RETURNING asset_tag
    `,
    values
  );

  return {
    insertedCount: result.rowCount,
    insertedTags: new Set(result.rows.map((row) => String(row.asset_tag).toLowerCase())),
  };
}

async function processBulkAssetUpload({ client, fileBuffer, fileName, user }) {
  const parsedRows = loadRowsFromFile(fileBuffer);

  if (!parsedRows.length) {
    return {
      totalRecords: 0,
      insertedRecords: 0,
      failedRecords: 0,
      failures: [{ rowNumber: 0, assetTag: "", field: "file", message: "No data rows found in file" }],
      errorReportCsv: buildErrorReportCsv([{ rowNumber: 0, assetTag: "", field: "file", message: "No data rows found in file" }]),
    };
  }

  if (parsedRows.length > MAX_ROWS) {
    const overLimit = [{ rowNumber: 0, assetTag: "", field: "file", message: `Maximum ${MAX_ROWS} rows allowed per upload` }];
    return {
      totalRecords: parsedRows.length,
      insertedRecords: 0,
      failedRecords: 1,
      failures: overLimit,
      errorReportCsv: buildErrorReportCsv(overLimit),
    };
  }

  const { preparedRows, failures } = validateRows(parsedRows);

  const existingTags = await getExistingAssetTags(
    client,
    preparedRows.map((row) => row.assetTag)
  );

  const validRows = [];
  let skippedCount = 0;
  preparedRows.forEach((row) => {
    if (existingTags.has(row.assetTag.toLowerCase())) {
      // Silently skip duplicates — already in DB, not a failure
      skippedCount += 1;
      return;
    }
    validRows.push(row);
  });

  await client.query("BEGIN");
  try {
    const { insertedCount, insertedTags } = await insertValidAssets(client, validRows);

    // Rows not returned by INSERT (conflict) are also silently skipped
    validRows.forEach((row) => {
      if (!insertedTags.has(row.assetTag.toLowerCase())) {
        skippedCount += 1;
      }
    });

    await ensureUploadLogTable(client);
    await client.query(
      `
      INSERT INTO asset_bulk_upload_logs
        (uploaded_by, uploader_email, file_name, total_rows, successful_rows, failed_rows)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        user?.id || null,
        user?.email || null,
        fileName,
        parsedRows.length,
        insertedCount,
        failures.length + skippedCount,
      ]
    );

    await client.query("COMMIT");

    return {
      totalRecords: parsedRows.length,
      insertedRecords: insertedCount,
      skippedRecords: skippedCount,
      failedRecords: failures.length,
      failures,
      errorReportCsv: failures.length ? buildErrorReportCsv(failures) : "",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function buildTemplateRows() {
  return [
    {
      "Asset ID*": "AST-1001",
      "Name*": "Dell Latitude 5440",
      "Type*": "laptop",
      Status: "available",
      "Location*": "Chennai HQ",
      "Purchase Date*": "2026-01-15",
      "Warranty Expiry*": "2029-01-15",
      Cost: "65000",
      Description: "Intel i7, 16GB RAM, 512GB SSD",
    },
  ];
}

function buildTemplateCsv() {
  const rows = buildTemplateRows();
  const headers = Object.keys(rows[0]);
  const csvRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];

  return csvRows
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function buildTemplateXlsxBuffer() {
  const rows = buildTemplateRows();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "AssetTemplate");
  return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  processBulkAssetUpload,
  buildTemplateCsv,
  buildTemplateXlsxBuffer,
};
