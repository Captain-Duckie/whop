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

        // Read Horizon Records file with detailed debugging
        console.log("Reading Horizon file...");
        let horizonData = [];
        try {
            const horizonFileBuffer = fs.readFileSync(horizonFilePath);
            console.log("Horizon file buffer size:", horizonFileBuffer.length);
            const horizonWorkbook = XLSX.read(horizonFileBuffer, { type: 'buffer' });
            console.log("Horizon sheet names available:", horizonWorkbook.SheetNames);
            
            // Check if "Horizon" sheet exists, otherwise use first sheet
            let horizonSheetName = "Horizon";
            if (!horizonWorkbook.Sheets[horizonSheetName]) {
                console.log("'Horizon' sheet not found, using first sheet:", horizonWorkbook.SheetNames[0]);
                horizonSheetName = horizonWorkbook.SheetNames[0];
            }
            
            console.log("Using Horizon sheet:", horizonSheetName);
            const horizonSheet = horizonWorkbook.Sheets[horizonSheetName];
            
            if (!horizonSheet) {
                console.error("Horizon sheet is null or undefined");
                horizonData = [];
            } else {
                horizonData = XLSX.utils.sheet_to_json(horizonSheet);
                console.log("Horizon data length:", horizonData.length);
                if (horizonData.length > 0) {
                    console.log("First horizon record:", horizonData[0]);
                    console.log("Horizon columns:", Object.keys(horizonData[0]));
                } else {
                    console.log("Horizon sheet appears to be empty");
                }
            }
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
            mythos: mythosData,
            debug: {
                timestamp: new Date().toISOString(),
                horizonFileExists: fs.existsSync(horizonFilePath),
                horizonFilePath: horizonFilePath,
                publicDirFiles: fs.readdirSync(path.join(process.cwd(), 'public')),
                horizonSheetNames: horizonData.length === 0 ? "Check server logs" : "Data loaded successfully"
            }
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
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

