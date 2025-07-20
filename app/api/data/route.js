import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        console.log("API route called - starting data load...");
        
        // Path to your Excel files
        const soccerFilePath = path.join(process.cwd(), 'public', 'Horizon Records.xlsx');
        const horizonFilePath = path.join(process.cwd(), 'public', 'Horizon Records.xlsx');
        const mythosFilePath = path.join(process.cwd(), 'public', 'Horizon Records.xlsx');
        
        console.log("File paths:", { soccerFilePath, horizonFilePath, mythosFilePath });
        console.log("Files exist?", {
            soccer: fs.existsSync(soccerFilePath),
            horizon: fs.existsSync(horizonFilePath), 
            mythos: fs.existsSync(mythosFilePath)
        });

        // Read Soccer Records file (now pointing to Horizon Records.xlsx)
        console.log("Reading soccer file...");
        const soccerFileBuffer = fs.readFileSync(soccerFilePath);
        const soccerWorkbook = XLSX.read(soccerFileBuffer, { type: 'buffer' });
        console.log("Soccer workbook sheet names:", soccerWorkbook.SheetNames);
        const soccerSheetName = "Mythos Soccer";
        const soccerSheet = soccerWorkbook.Sheets[soccerSheetName];
        console.log("Soccer sheet found:", !!soccerSheet);
        const soccerData = soccerSheet ? XLSX.utils.sheet_to_json(soccerSheet) : [];

        // Read Horizon Records file
        console.log("Reading horizon file...");
        const horizonFileBuffer = fs.readFileSync(horizonFilePath);
        const horizonWorkbook = XLSX.read(horizonFileBuffer, { type: 'buffer' });
        console.log("Horizon workbook sheet names:", horizonWorkbook.SheetNames);
        const horizonSheetName = "Horizon";
        const horizonSheet = horizonWorkbook.Sheets[horizonSheetName];
        console.log("Horizon sheet found:", !!horizonSheet);
        const horizonData = horizonSheet ? XLSX.utils.sheet_to_json(horizonSheet) : [];

        // Read Mythos Dataset file
        console.log("Reading mythos file...");
        const mythosFileBuffer = fs.readFileSync(mythosFilePath);
        const mythosWorkbook = XLSX.read(mythosFileBuffer, { type: 'buffer' });
        console.log("Mythos workbook sheet names:", mythosWorkbook.SheetNames);
        const mythosSheetName = mythosWorkbook.SheetNames[0]; // Use first sheet
        const mythosSheet = mythosWorkbook.Sheets[mythosSheetName];
        console.log("Mythos sheet found:", !!mythosSheet);
        const mythosData = mythosSheet ? XLSX.utils.sheet_to_json(mythosSheet) : [];

        console.log("Data loaded successfully:", {
            soccer: soccerData.length,
            horizon: horizonData.length,
            mythos: mythosData.length
        });

        return new Response(JSON.stringify({
            soccer: soccerData,
            horizon: horizonData,
            mythos: mythosData,
            debug: {
                timestamp: new Date().toISOString(),
                dataLengths: {
                    soccer: soccerData.length,
                    horizon: horizonData.length,
                    mythos: mythosData.length
                }
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error stack:', error.stack);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to load data',
                message: error.message,
                stack: error.stack
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

