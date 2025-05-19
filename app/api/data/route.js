import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        // Path to your Excel file
        const filePath = path.join(process.cwd(), 'public', 'Soccer Records.xlsx');
        const fileBuffer = fs.readFileSync(filePath);

        // Read the Excel file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = "Mythos Soccer"; // Use the exact sheet name;
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        return new Response(JSON.stringify(jsonData), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch {
        return new Response(
            JSON.stringify({ error: 'Failed to load data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

