"use client";

import { useEffect, useState } from "react";

// ✅ Move type definition **above** Dashboard()
type SoccerData = {
  League: string;
  "Home Team": string;
  "Away Team": string;
  [key: string]: string | number;
};

export default function Dashboard() {
    const [data, setData] = useState<SoccerData[]>([]); 
    const [selectedLeague, setSelectedLeague] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [teamFilterType, setTeamFilterType] = useState("All");

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

    const filterByTeam = (data: SoccerData[]) => {
        if (!selectedTeam) return data;
    
        return data.filter((row) => {
          if (teamFilterType === "Home") return row["Home Team"] === selectedTeam;
          if (teamFilterType === "Away") return row["Away Team"] === selectedTeam;
          if (teamFilterType === "All")
            return row["Home Team"] === selectedTeam || row["Away Team"] === selectedTeam;
          return true;
        });
      };
    
    const filteredData = filterByTeam(
      selectedLeague ? data.filter(row => row.League === selectedLeague) : data
    );

    const calculateStats = (playType: string) => {
        const playData = filteredData.filter(row => row[playType] === "Over");
        const wins = playData.filter(row => Number(row["FH Goals"]) >= 1).length;
        const losses = playData.filter(row => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum = playData.length > 0 
          ? parseFloat(((wins / playData.length) * 100).toFixed(2)) 
          : 0;
      
        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
      };
        const calculateSharedStats = () => {
        const sharedData = filteredData.filter(row => row["M FHG"] === "Over" && row["SN FHG"] === "Over");
        const wins = sharedData.filter(row => Number(row["FH Goals"]) >= 1).length;
        const losses = sharedData.filter(row => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum = sharedData.length > 0 
          ? parseFloat(((wins / sharedData.length) * 100).toFixed(2)) 
          : 0;
      
        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
      };

    // Generate stats for each play type
    const supernovaStats = calculateStats("SN FHG");
    const mythosStats = calculateStats("M FHG");
    const sharedStats = calculateSharedStats();
    const teamsForLeague = filterByTeam(
      selectedLeague ? data.filter((row) => row.League === selectedLeague) : data
    );

    const uniqueTeams = [
        ...new Set(teamsForLeague.flatMap((row) => [row["Home Team"], row["Away Team"]]))
        ].filter(Boolean) // remove null/undefined
        .sort((a, b) => a.localeCompare(b)); // sort alphabetically

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Mythos Soccer Dashboard</h1>

            {/* League Filter Dropdown */}
            <select
                className="mb-4 p-2 border bg-gray-800 text-white"
                onChange={(e) => setSelectedLeague(e.target.value)}
                value={selectedLeague}
            >
                <option value="">All Leagues</option>
                {data.length > 0 && [...new Set(data.map(row => row.League))].map((league) => (
                    <option key={league} value={league}>{league}</option>
                ))}
            </select>
            <select
                className="mb-4 p-2 border bg-gray-800 text-white"
                onChange={(e) => setSelectedTeam(e.target.value)}
                value={selectedTeam}
                >
                <option value="">All Teams</option>
                {uniqueTeams.map((team) => (
                    <option key={team} value={team}>
                    {team}
                    </option>
                ))}
                </select>
        
        
              {/* Team Filter Type Dropdown */}
              <select
                className="mb-4 p-2 border bg-gray-800 text-white"
                onChange={(e) => setTeamFilterType(e.target.value)}
                value={teamFilterType}
              >
                <option value="All">All Games</option>
                <option value="Home">Home Team</option>
                <option value="Away">Away Team</option>
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
