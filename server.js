const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

console.log("Server file started");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data", "reports.json");

function readReports() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveReports(reports) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}

// Get all reports
app.get("/api/reports", (req, res) => {
    res.json(readReports());
});

// Get single report
app.get("/api/reports/:id", (req, res) => {
    const reports = readReports();

    const report = reports.find(r => r.id == req.params.id);

    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }

    if (report.matchedWith) {
        report.matched_item = reports.find(r => r.id == report.matchedWith);
    }

    res.json(report);
});

// Add report
app.post("/api/reports", (req, res) => {

    const reports = readReports();

    const newReport = {
        id: Date.now(),
        type: req.body.type,
        item_name: req.body.item_name,
        category: req.body.category,
        location: req.body.location,
        date_text: req.body.date_text,
        description: req.body.description || "",
        contact: req.body.contact || "",
        status: "unclaimed",
        created_at: new Date().toISOString()
    };

    let matched = false;

    for (let report of reports) {
        if (
            report.type !== newReport.type &&
            report.item_name.toLowerCase() === newReport.item_name.toLowerCase() &&
            report.category === newReport.category &&
            report.location.toLowerCase() === newReport.location.toLowerCase() &&
            report.status === "unclaimed"
        ) {
            report.status = "matched";
            newReport.status = "matched";

            report.matchedWith = newReport.id;
            newReport.matchedWith = report.id;

            matched = true;
            break;
        }
    }

    reports.push(newReport);
    saveReports(reports);

    res.status(201).json({
        message: matched ? "Match Found!" : "Report Added",
        report: newReport
    });

});

// Update report
app.put("/api/reports/:id", (req, res) => {

    const reports = readReports();

    const report = reports.find(r => r.id == req.params.id);

    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }

    report.item_name = req.body.item_name;
    report.category = req.body.category;
    report.location = req.body.location;
    report.date_text = req.body.date_text;
    report.description = req.body.description;
    report.contact = req.body.contact;

    saveReports(reports);

    res.json({
        message: "Report updated successfully",
        report
    });
});

// Delete report
app.delete("/api/reports/:id", (req, res) => {

    let reports = readReports();

    const index = reports.findIndex(r => r.id == req.params.id);

    if (index === -1) {
        return res.status(404).json({ message: "Report not found" });
    }

    reports.splice(index, 1);

    saveReports(reports);

    res.json({
        message: "Report deleted successfully"
    });
});

// Claim report
app.patch("/api/reports/:id/claim", (req, res) => {

    const reports = readReports();

    const report = reports.find(r => r.id == req.params.id);

    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }

    report.status = "claimed";

    if (report.matchedWith) {
        const matched = reports.find(r => r.id == report.matchedWith);
        if (matched) matched.status = "claimed";
    }

    saveReports(reports);

    res.json({
        message: "Case claimed successfully",
        report
    });
});
console.log("Reached app.listen");

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});