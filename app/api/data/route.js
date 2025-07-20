import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        console.log("Starting data load...");
        // Path to your Excel files
        const soccerFilePath = path.join(process.cwd(), 'public', 'Soccer Records.xlsx');
        const horizonFilePath = path.join(process.cwd(), 'public', 'Horizon Records.xlsx');
        const mythosFilePath = path.join(process.cwd(), 'public', 'Mythos Dataset.xlsx');

        console.log("File paths:", { soccerFilePath, horizonFilePath, mythosFilePath });

        // Check if files exist
        console.log("Soccer file exists:", fs.existsSync(soccerFilePath));
        console.log("Horizon file exists:", fs.existsSync(horizonFilePath));
        console.log("Mythos file exists:", fs.existsSync(mythosFilePath));

        // Read Soccer Records file (main dataset)
        const soccerFileBuffer = fs.readFileSync(soccerFilePath);
        const soccerWorkbook = XLSX.read(soccerFileBuffer, { type: 'buffer' });
        const soccerSheetName = "Mythos Soccer";
        const soccerSheet = soccerWorkbook.Sheets[soccerSheetName];
        const soccerData = XLSX.utils.sheet_to_json(soccerSheet);
        console.log("Soccer data length:", soccerData.length);

        // Read Horizon data from Horizon Records file
        console.log("Reading Horizon file...");
        let horizonData = [];
        try {
            const horizonFileBuffer = fs.readFileSync(horizonFilePath);
            console.log("Horizon file buffer size:", horizonFileBuffer.length);
            const horizonWorkbook = XLSX.read(horizonFileBuffer, { type: 'buffer' });
            console.log("Horizon sheet names:", horizonWorkbook.SheetNames);
            
            // Try using "Horizon" sheet first, then fall back to first sheet
            let horizonSheetName = "Horizon";
            if (!horizonWorkbook.Sheets[horizonSheetName]) {
                console.log("'Horizon' sheet not found, using first sheet:", horizonWorkbook.SheetNames[0]);
                horizonSheetName = horizonWorkbook.SheetNames[0];
            }
            
            const horizonSheet = horizonWorkbook.Sheets[horizonSheetName];
            console.log("Using sheet:", horizonSheetName);
            horizonData = XLSX.utils.sheet_to_json(horizonSheet);
            console.log("Horizon data length:", horizonData.length);
            console.log("First horizon record:", horizonData[0]);
        } catch (horizonError) {
            console.error("Error reading Horizon file:", horizonError);
            horizonData = [];
        }

        // Read Mythos Dataset file
        const mythosFileBuffer = fs.readFileSync(mythosFilePath);
        const mythosWorkbook = XLSX.read(mythosFileBuffer, { type: 'buffer' });
        const mythosSheetName = mythosWorkbook.SheetNames[0]; // Use first sheet
        const mythosSheet = mythosWorkbook.Sheets[mythosSheetName];
        const mythosData = XLSX.utils.sheet_to_json(mythosSheet);

        const response = new Response(JSON.stringify({
            soccer: soccerData,
            horizon: horizonData,
            mythos: mythosData
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
            }
        });

        console.log("Response data lengths:", {
            soccer: soccerData.length,
            horizon: horizonData.length,
            mythos: mythosData.length
        });

        return response;
    } catch (error) {
        console.error('Error loading data:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to load data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

