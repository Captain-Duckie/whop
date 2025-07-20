import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET(req) {
    try {
        // Soccer Records
        const soccerPath = path.join(process.cwd(), 'public', 'Soccer Records.xlsx');
        const soccerBuffer = fs.readFileSync(soccerPath);
        const soccerWorkbook = XLSX.read(soccerBuffer, { type: 'buffer' });
        const soccerSheet = soccerWorkbook.Sheets["Mythos Soccer"];
        const soccerData = XLSX.utils.sheet_to_json(soccerSheet);

        // Horizon Records
        const horizonPath = path.join(process.cwd(), 'public', 'Horizon Records.xlsx');
        const horizonBuffer = fs.readFileSync(horizonPath);
        const horizonWorkbook = XLSX.read(horizonBuffer, { type: 'buffer' });
        const horizonSheet = horizonWorkbook.Sheets["Horizon"] || horizonWorkbook.Sheets[Object.keys(horizonWorkbook.Sheets)[0]];
        const horizonData = XLSX.utils.sheet_to_json(horizonSheet);

        // Mythos Dataset
        const mythosPath = path.join(process.cwd(), 
        'public', 'Mythos Dataset.xlsx');
        let mythosData = [];
        if (fs.existsSync(mythosPath)) {
            const mythosBuffer = fs.readFileSync(mythosPath);
            const mythosWorkbook = XLSX.read(mythosBuffer, { type: 'buffer' });
            const mythosSheet = mythosWorkbook.Sheets["Soccer"];
            if (mythosSheet) {
                mythosData = XLSX.utils.sheet_to_json(mythosSheet);
            }
        }
        // Debug output for Mythos Dataset
        console.log("Mythos Dataset loaded:", mythosData.length, "rows");
        if (mythosData.length > 0) {
            console.log("First few Mythos rows:", mythosData.slice(0, 3));
        } else {
            console.log("Mythos Dataset is empty or sheet not found.");
        }

        // Debug output
        //console.log("Soccer Records loaded:", soccerData.length, "rows");
        //console.log("Horizon Records loaded:", horizonData.length, "rows");
        //console.log("First few Horizon rows:", horizonData.slice(0, 3));

        return new Response(JSON.stringify({
            soccer: soccerData,
            horizon: horizonData,
            mythos: mythosData
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' // Cache for 1 hour, allow stale for 2 hours
            }
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Failed to load data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

