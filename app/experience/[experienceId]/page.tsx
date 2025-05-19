"use client";

import { getWhopApi } from "./whop-api";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(""); // Stores League filter

    useEffect(() => {
        fetch("/api/data")
            .then(response => response.json())
            .then(setData)
            .catch(console.error);

        fetch("/api/whop")
            .then(response => response.json())
            .then(data => console.log("Whop User Data:", data))
            .catch(console.error);
    }, []);



    // Function to calculate wins, losses, and win percentage for a play type
    const calculateStats = (playType) => {
        const filteredData = selectedLeague ? data.filter(row => row.League === selectedLeague) : data;

        const playData = filteredData.filter(row => row[playType] === "Over");
        const wins = playData.filter(row => row["FH Goals"] >= 1).length;
        const losses = playData.filter(row => row["FH Goals"] === 0).length;
        const winPercentage = ((wins / playData.length) * 100).toFixed(2);

        return { wins, losses, winPercentage: isNaN(winPercentage) ? "N/A" : `${winPercentage}%` };
    };
    const calculateSharedStats = () => {
        const filteredData = selectedLeague ? data.filter(row => row.League === selectedLeague) : data;

        // Find rows where BOTH "M FHG" AND "SN FHG" are "Over"
        const sharedData = filteredData.filter(row => row["M FHG"] === "Over" && row["SN FHG"] === "Over");
        const wins = sharedData.filter(row => row["FH Goals"] >= 1).length;
        const losses = sharedData.filter(row => row["FH Goals"] === 0).length;
        const winPercentage = ((wins / sharedData.length) * 100).toFixed(2);

        return { wins, losses, winPercentage: isNaN(winPercentage) ? "N/A" : `${winPercentage}%` };
    };

    // Generate stats for each play type
    const supernovaStats = calculateStats("SN FHG");
    const mythosStats = calculateStats("M FHG");
    const sharedStats = calculateSharedStats();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Mythos Soccer Dashboard</h1>

            {/* League Filter Dropdown */}
            <select
                className="mb-4 p-2 border"
                onChange={(e) => setSelectedLeague(e.target.value)}
                value={selectedLeague}
            >
                <option value="">All Leagues</option>
                {[...new Set(data.map(row => row.League))].map((league) => (
                    <option key={league} value={league}>{league}</option>
                ))}
            </select>

            {/* Summary Statistic Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Supernova Card */}
                <div className="p-4 border rounded shadow">
                    <h2 className="text-lg font-semibold">Supernova FHG</h2>
                    <p className="text-sm">Wins: {supernovaStats.wins}</p>
                    <p className="text-sm">Losses: {supernovaStats.losses}</p>
                    <p className="text-sm">Win %: {supernovaStats.winPercentage}</p>
                </div>
                
                {/* Mythos Card */}
                <div className="p-4 border rounded shadow">
                    <h2 className="text-lg font-semibold">Mythos FHG</h2>
                    <p className="text-sm">Wins: {mythosStats.wins}</p>
                    <p className="text-sm">Losses: {mythosStats.losses}</p>
                    <p className="text-sm">Win %: {mythosStats.winPercentage}</p>
                </div>

                {/* Shared Play Card */}
                <div className="p-4 border rounded shadow">
                    <h2 className="text-lg font-semibold">Shared FHG</h2>
                    <p className="text-sm">Wins: {sharedStats.wins}</p>
                    <p className="text-sm">Losses: {sharedStats.losses}</p>
                    <p className="text-sm">Win %: {sharedStats.winPercentage}</p>
                </div>
            </div>
        </div>
    );
}