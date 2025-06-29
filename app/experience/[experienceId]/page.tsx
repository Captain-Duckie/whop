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
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const clearFilters = () => {
        setSelectedLeague(""); // Reset league selection 
        setSelectedTeam(""); // Reset selected teams
        setTeamFilterType("All"); // Reset team filter type
        setStartDate("");
        setEndDate("");
    };


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
    useEffect(() => {
        if (selectedLeague) {
            setSelectedTeam(""); // Reset teams when league changes
        }
    }, [selectedLeague]);

      // Function to filter by team selection
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
    const filterByDateRange = (data: SoccerData[]) => {
        if (!startDate && !endDate) return data;

        return data.filter((row) => {
        const rowDate = new Date(row.Date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (!start || rowDate >= start) && (!end || rowDate <= end);
        });
    };


    // Apply filters before calculating stats
    const filteredData = filterByDateRange(filterByTeam(
    selectedLeague ? data.filter((row) => row.League === selectedLeague) : data
    ));
    const teamsForLeague = selectedLeague
        ? data.filter((row) => row.League === selectedLeague)
        : data;
    const uniqueTeams = [
        ...new Set(teamsForLeague.flatMap((row) => [row["Home Team"], row["Away Team"]]))
        ].filter(Boolean) // remove null/undefined
        .sort((a, b) => a.localeCompare(b)); // sort alphabetically



    const calculateFHStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over");
        const wins = playData.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = playData.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum =
        playData.length > 0 ? parseFloat(((wins / playData.length) * 100).toFixed(2)) : 0;

        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
    };

    const calculateFHSharedStats = () => {
        const sharedData = filteredData.filter(
        (row) => row["M FHG"] === "Over" && row["SN FHG"] === "Over"
        );
        const wins = sharedData.filter((row) => Number(row["FH Goals"]) >= 1).length;
        const losses = sharedData.filter((row) => Number(row["FH Goals"]) === 0).length;
        const winPercentageNum =
        sharedData.length > 0 ? parseFloat(((wins / sharedData.length) * 100).toFixed(2)) : 0;

        return { wins, losses, winPercentage: isNaN(winPercentageNum) ? "N/A" : `${winPercentageNum}%` };
    };
  /// FT Goal Stats
    const calculateFTGoalStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over" || row[playType] === "Under");

        const overPlays = playData.filter((row) => row[playType] === "Over");
        const underPlays = playData.filter((row) => row[playType] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };
    const calculateCombinedFTGoalStats = () => {
        const playData = filteredData.filter(
            (row) => (row["M FTG"] === "Over" && row["SN FTG"] === "Over") || 
                    (row["M FTG"] === "Under" && row["SN FTG"] === "Under")
        );

        const overPlays = playData.filter((row) => row["M FTG"] === "Over" && row["SN FTG"] === "Over");
        const underPlays = playData.filter((row) => row["M FTG"] === "Under" && row["SN FTG"] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Goals"]) > Number(row["Pregame Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Goals"]) <= Number(row["Pregame Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Goals"]) < Number(row["Pregame Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Goals"]) >= Number(row["Pregame Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };

    const calculateFTCStats = (playType: string) => {
        const playData = filteredData.filter((row) => row[playType] === "Over" || row[playType] === "Under");

        const overPlays = playData.filter((row) => row[playType] === "Over");
        const underPlays = playData.filter((row) => row[playType] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };
    const calculateCombinedFTCStats = () => {
        const playData = filteredData.filter(
            (row) => (row["M FTC"] === "Over" && row["SN FTC"] === "Over") || 
                    (row["M FTC"] === "Under" && row["SN FTC"] === "Under")
        );

        const overPlays = playData.filter((row) => row["M FTC"] === "Over" && row["SN FTC"] === "Over");
        const underPlays = playData.filter((row) => row["M FTC"] === "Under" && row["SN FTC"] === "Under");

        const overWins = overPlays.filter((row) => Number(row["FT Corners"]) > Number(row["Pregame Corner Line"])).length;
        const overLosses = overPlays.filter((row) => Number(row["FT Corners"]) <= Number(row["Pregame Corner Line"])).length;

        const underWins = underPlays.filter((row) => Number(row["FT Corners"]) < Number(row["Pregame Corner Line"])).length;
        const underLosses = underPlays.filter((row) => Number(row["FT Corners"]) >= Number(row["Pregame Corner Line"])).length;

        const overWinPercentage = (overWins + overLosses) > 0 ? ((overWins / (overWins + overLosses)) * 100).toFixed(2) : "N/A";
        const underWinPercentage = (underWins + underLosses) > 0 ? ((underWins / (underWins + underLosses)) * 100).toFixed(2) : "N/A";

        return {
            over: { wins: overWins, losses: overLosses, winPercentage: `${overWinPercentage}%` },
            under: { wins: underWins, losses: underLosses, winPercentage: `${underWinPercentage}%` },
        };
    };

    const sharedFTGoalStats = calculateCombinedFTGoalStats();
    const fullTimeGoalStatsMythos = calculateFTGoalStats("M FTG");
    const fullTimeGoalStatsSuperNova = calculateFTGoalStats("SN FTG");

    const sharedFTCStats = calculateCombinedFTCStats();
    const fullTimeCornerStatsMythos = calculateFTCStats("M FTC");
    const fullTimeCornerStatsSuperNova = calculateFTCStats("SN FTC");

    const supernovaStats = calculateFHStats("SN FHG");
    const mythosStats = calculateFHStats("M FHG");
    const sharedStats = calculateFHSharedStats();
    const nebulaStats = calculateFHStats("Nebula");


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
            {data.length > 0 &&
            [...new Set(data.map((row) => row.League))].map((league) => (
                <option key={league} value={league}>
                {league}
                </option>
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

         {/* Date Filter Boxes */}
        <div className="flex gap-4 mb-4">
          <input
              type="date"
              className="p-2 border bg-gray-800 text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
          />
          <input
              type="date"
              className="p-2 border bg-gray-800 text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
          />
          </div>

        <button 
            onClick={clearFilters} 
            className="mb-4 p-2 border bg-red-600 text-white rounded hover:bg-red-700"
        >
            Clear Filters
        </button>

        {/* Summary Statistic Cards */}
        <h2 className="text-2xl font-bold mt-6 mb-2">First Half Goals</h2>
        <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Supernova</h2>
                <p className="text-sm">Wins: {supernovaStats.wins}</p>
                <p className="text-sm">Losses: {supernovaStats.losses}</p>
                <p className="text-sm">Win %: {supernovaStats.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Mythos</h2>
                <p className="text-sm">Wins: {mythosStats.wins}</p>
                <p className="text-sm">Losses: {mythosStats.losses}</p>
                <p className="text-sm">Win %: {mythosStats.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Shared</h2>
                <p className="text-sm">Wins: {sharedStats.wins}</p>
                <p className="text-sm">Losses: {sharedStats.losses}</p>
                <p className="text-sm">Win %: {sharedStats.winPercentage}</p>
            </div>
        </div>
        {/* Second row: Nebula */}
        <div className="grid grid-cols-1">
            <div className="p-4 border rounded shadow">
            <h2 className="text-lg font-semibold">Nebula</h2>
            <p className="text-sm">Wins: {nebulaStats.wins}</p>
            <p className="text-sm">Losses: {nebulaStats.losses}</p>
            <p className="text-sm">Win %: {nebulaStats.winPercentage}</p>
            </div>
        </div>
        {/* Full-Time Corner Stats - 3rd Row */}
        <h2 className="text-2xl font-bold mt-6 mb-2">Full Time Corners - Overs are Backend Only</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - SuperNova</h2>
                <p className="text-sm">Wins: {fullTimeCornerStatsSuperNova.over.wins}</p>
                <p className="text-sm">Losses: {fullTimeCornerStatsSuperNova.over.losses}</p>
                <p className="text-sm">Win %: {fullTimeCornerStatsSuperNova.over.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - Mythos</h2>
                <p className="text-sm">Wins: {fullTimeCornerStatsMythos.over.wins}</p>
                <p className="text-sm">Losses: {fullTimeCornerStatsMythos.over.losses}</p>
                <p className="text-sm">Win %: {fullTimeCornerStatsMythos.over.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - Shared</h2>
                <p className="text-sm">Wins: {sharedFTCStats.over.wins}</p>
                <p className="text-sm">Losses: {sharedFTCStats.over.losses}</p>
                <p className="text-sm">Win %: {sharedFTCStats.over.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - SuperNova</h2>
                <p className="text-sm">Wins: {fullTimeCornerStatsSuperNova.under.wins}</p>
                <p className="text-sm">Losses: {fullTimeCornerStatsSuperNova.under.losses}</p>
                <p className="text-sm">Win %: {fullTimeCornerStatsSuperNova.under.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - Mythos</h2>
                <p className="text-sm">Wins: {fullTimeCornerStatsMythos.under.wins}</p>
                <p className="text-sm">Losses: {fullTimeCornerStatsMythos.under.losses}</p>
                <p className="text-sm">Win %: {fullTimeCornerStatsMythos.under.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - Shared</h2>
                <p className="text-sm">Wins: {sharedFTCStats.under.wins}</p>
                <p className="text-sm">Losses: {sharedFTCStats.under.losses}</p>
                <p className="text-sm">Win %: {sharedFTCStats.under.winPercentage}</p>
            </div>
        </div>
        {/* Full-Time Goal Stats - Second Row */}
        <h2 className="text-2xl font-bold mt-6 mb-2">Full Time Goals - Backend Only</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - SuperNova</h2>
                <p className="text-sm">Wins: {fullTimeGoalStatsSuperNova.over.wins}</p>
                <p className="text-sm">Losses: {fullTimeGoalStatsSuperNova.over.losses}</p>
                <p className="text-sm">Win %: {fullTimeGoalStatsSuperNova.over.winPercentage}</p>
            </div>
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - Mythos</h2>
                <p className="text-sm">Wins: {fullTimeGoalStatsMythos.over.wins}</p>
                <p className="text-sm">Losses: {fullTimeGoalStatsMythos.over.losses}</p>
                <p className="text-sm">Win %: {fullTimeGoalStatsMythos.over.winPercentage}</p>
            </div>
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Over - Shared</h2>
                <p className="text-sm">Wins: {sharedFTGoalStats.over.wins}</p>
                <p className="text-sm">Losses: {sharedFTGoalStats.over.losses}</p>
                <p className="text-sm">Win %: {sharedFTGoalStats.over.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - SuperNova</h2>
                <p className="text-sm">Wins: {fullTimeGoalStatsSuperNova.under.wins}</p>
                <p className="text-sm">Losses: {fullTimeGoalStatsSuperNova.under.losses}</p>
                <p className="text-sm">Win %: {fullTimeGoalStatsSuperNova.under.winPercentage}</p>
            </div>
            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - Mythos</h2>
                <p className="text-sm">Wins: {fullTimeGoalStatsMythos.under.wins}</p>
                <p className="text-sm">Losses: {fullTimeGoalStatsMythos.under.losses}</p>
                <p className="text-sm">Win %: {fullTimeGoalStatsMythos.under.winPercentage}</p>
            </div>

            <div className="p-4 border rounded shadow">
                <h2 className="text-lg font-semibold">Under - Shared</h2>
                <p className="text-sm">Wins: {sharedFTGoalStats.under.wins}</p>
                <p className="text-sm">Losses: {sharedFTGoalStats.under.losses}</p>
                <p className="text-sm">Win %: {sharedFTGoalStats.under.winPercentage}</p>
            </div>
        </div>
    </div>
        
    );
}

