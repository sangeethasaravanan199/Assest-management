require("dotenv").config({ override: true });

const bcrypt = require("bcryptjs");
const pool = require("../config/db");

function buildDummyAssets() {
  const baseAssets = [
    ["LAP-1001", "Dell Latitude 7440", "laptop", "assigned", "2024-02-15", "2027-02-15", "Chennai HQ", "16GB RAM, 512GB SSD, i7"],
    ["LAP-1002", "Lenovo ThinkPad T14", "laptop", "available", "2024-05-01", "2027-05-01", "Chennai HQ", "16GB RAM, 512GB SSD, Ryzen 7"],
    ["DESK-2101", "HP ProDesk 400", "desktop", "available", "2023-11-20", "2026-11-20", "Bangalore Office", "32GB RAM, 1TB SSD, i7"],
    ["MON-3101", "LG Ultrawide 34", "monitor", "assigned", "2024-01-10", "2027-01-10", "Bangalore Office", "34-inch IPS"],
    ["PRN-4101", "HP LaserJet Pro M404", "printer", "maintenance", "2023-06-30", "2026-06-30", "Chennai HQ", "Network monochrome"],
    ["NET-5101", "Cisco Catalyst 9200", "network_device", "retired", "2020-03-05", "2023-03-05", "Chennai Data Center", "24-port managed switch"],
    ["NET-5102", "Ubiquiti Dream Machine Pro", "network_device", "available", "2024-07-19", "2027-07-19", "Bangalore Office", "Gateway + NVR"],
    ["MON-3102", "Dell 27 USB-C", "monitor", "available", "2024-04-11", "2027-04-11", "Remote Stock", "27-inch QHD"],
    ["LAP-1003", "MacBook Pro 14", "laptop", "assigned", "2024-08-08", "2027-08-08", "Chennai HQ", "M3 Pro, 18GB RAM"],
    ["DESK-2102", "Lenovo ThinkCentre M90", "desktop", "available", "2024-09-21", "2027-09-21", "Chennai HQ", "16GB RAM, 1TB SSD"],
  ];

  const assetTypes = [
    {
      key: "laptop",
      prefix: "LAP",
      names: ["Dell Latitude 5450", "HP EliteBook 840", "Lenovo ThinkPad E14", "Acer TravelMate P4"],
      specs: ["16GB RAM, 512GB SSD", "8GB RAM, 256GB SSD", "16GB RAM, 1TB SSD"],
    },
    {
      key: "desktop",
      prefix: "DESK",
      names: ["Dell OptiPlex 7010", "HP Pro Tower 280", "Lenovo ThinkCentre Neo 50t", "Acer Veriton X"],
      specs: ["16GB RAM, 512GB SSD", "32GB RAM, 1TB SSD", "8GB RAM, 256GB SSD"],
    },
    {
      key: "monitor",
      prefix: "MON",
      names: ["Dell 24 Monitor", "LG 27 IPS", "Samsung ViewFinity", "BenQ GW2780"],
      specs: ["24-inch FHD", "27-inch QHD", "32-inch 4K"],
    },
    {
      key: "printer",
      prefix: "PRN",
      names: ["HP LaserJet MFP 135", "Brother HL-L2371DN", "Canon imageCLASS MF3010"],
      specs: ["Mono laser printer", "Network duplex printer", "Compact office printer"],
    },
    {
      key: "network_device",
      prefix: "NET",
      names: ["Cisco Meraki MX68", "TP-Link JetStream", "Ubiquiti UniFi Switch 24", "Fortinet FortiGate 60F"],
      specs: ["Managed switch", "Firewall appliance", "VPN gateway", "24-port switch"],
    },
  ];

  const statuses = ["available", "reserved", "assigned", "maintenance", "retired"];
  const locations = ["Chennai HQ", "Bangalore Office", "Hyderabad Branch", "Pune Office", "Remote Stock", "Chennai Data Center"];
  const generatedAssets = [...baseAssets];

  for (let index = 0; index < 90; index += 1) {
    const type = assetTypes[index % assetTypes.length];
    const serial = String(1100 + index).padStart(4, "0");
    const purchaseMonth = String((index % 12) + 1).padStart(2, "0");
    const purchaseDay = String(((index * 2) % 28) + 1).padStart(2, "0");
    const purchaseDate = `2024-${purchaseMonth}-${purchaseDay}`;
    const warrantyDate = `2027-${purchaseMonth}-${purchaseDay}`;

    generatedAssets.push([
      `${type.prefix}-${serial}`,
      type.names[index % type.names.length],
      type.key,
      statuses[index % statuses.length],
      purchaseDate,
      warrantyDate,
      locations[index % locations.length],
      type.specs[index % type.specs.length],
    ]);
  }

  return generatedAssets;
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM maintenance_requests");
    await client.query("DELETE FROM asset_assignments");
    await client.query("DELETE FROM assets");
    await client.query("DELETE FROM users");

    const users = [
      {
        name: "System Administrator",
        email: "admin@assets.local",
        password: "Admin@123",
        role: "admin",
        department: "IT Operations",
      },
      {
        name: "Arun Kumar",
        email: "arun.kumar@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Engineering",
      },
      {
        name: "Audit Officer",
        email: "auditor@assets.local",
        password: "Auditor@123",
        role: "auditor",
        department: "IT Audit",
      },
      {
        name: "IT Operations",
        email: "it.ops@assets.local",
        password: "ItOps@123",
        role: "it",
        department: "IT Operations",
      },
      {
        name: "Neha Sharma",
        email: "neha.sharma@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Finance",
      },
      {
        name: "Ravi Nair",
        email: "ravi.nair@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Operations",
      },
      {
        name: "Priya Menon",
        email: "priya.menon@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Human Resources",
      },
      {
        name: "Karthik Rao",
        email: "karthik.rao@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Information Technology",
      },
      {
        name: "Meera Iyer",
        email: "meera.iyer@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Marketing",
      },
      {
        name: "Vikram Patel",
        email: "vikram.patel@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Sales",
      },
      {
        name: "Divya Krishnan",
        email: "divya.krishnan@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Engineering",
      },
      {
        name: "Sanjay Verma",
        email: "sanjay.verma@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Finance",
      },
      {
        name: "Anita Das",
        email: "anita.das@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Operations",
      },
      {
        name: "Rohit Bansal",
        email: "rohit.bansal@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Customer Support",
      },
      {
        name: "Lakshmi N",
        email: "lakshmi.n@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Procurement",
      },
      {
        name: "Harish Kumar",
        email: "harish.kumar@assets.local",
        password: "Employee@123",
        role: "employee",
        department: "Information Technology",
      },
    ];

    const userIds = {};

    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      const result = await client.query(
        `
        INSERT INTO users (name, email, password_hash, role, department)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email
        `,
        [user.name, user.email, hash, user.role, user.department]
      );
      userIds[result.rows[0].email] = result.rows[0].id;
    }

    const assets = buildDummyAssets();

    const assetIdByTag = {};

    for (const asset of assets) {
      const result = await client.query(
        `
        INSERT INTO assets
        (asset_tag, name, type, status, purchase_date, warranty_expiry, location, specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, asset_tag
        `,
        asset
      );
      assetIdByTag[result.rows[0].asset_tag] = result.rows[0].id;
    }

    await client.query(
      `
      INSERT INTO asset_assignments (asset_id, employee_id, assigned_by, expected_return_date, notes)
      VALUES
      ($1, $2, $3, $4, $5),
      ($6, $7, $3, $8, $9)
      `,
      [
        assetIdByTag["LAP-1001"],
        userIds["arun.kumar@assets.local"],
        userIds["admin@assets.local"],
        "2026-06-30",
        "Development workstation",
        assetIdByTag["LAP-1003"],
        userIds["neha.sharma@assets.local"],
        "2026-08-15",
        "Finance reporting laptop",
      ]
    );

    await client.query(
      `
      INSERT INTO maintenance_requests
      (asset_id, requested_by, title, description, status, priority, cost, resolved_at)
      VALUES
      ($1, $2, $3, $4, 'open', 'high', NULL, NULL),
      ($5, $6, $7, $8, 'resolved', 'medium', 4500.00, NOW() - INTERVAL '20 days')
      `,
      [
        assetIdByTag["PRN-4101"],
        userIds["ravi.nair@assets.local"],
        "Printer paper jam and toner warning",
        "Printer shows recurring paper jam at tray 2 and low toner warning after restart.",
        assetIdByTag["DESK-2101"],
        userIds["arun.kumar@assets.local"],
        "Desktop fan noise",
        "Unusual fan noise at high CPU load, likely requires fan replacement.",
      ]
    );

    await client.query("COMMIT");

    console.log("Database seeded successfully.");
    console.log("Admin login: admin@assets.local / Admin@123");
    console.log("Employee login: arun.kumar@assets.local / Employee@123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database seed failed", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
