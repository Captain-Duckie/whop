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
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [teamFilterType, setTeamFilterType] = useState("All");

    const clearFilters = () => {
        setSelectedLeague(""); // Reset league selection
        setSelectedTeams([]); // Reset selected teams
        setTeamFilterType("All"); // Reset team filter type
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

    const filterByTeam = (data: SoccerData[]) => {
        if (!selectedTeams.length) return data; // Return all data if no team is selected

        return data.filter((row) => {
            if (teamFilterType === "Home") return selectedTeams.includes(row["Home Team"]);
            if (teamFilterType === "Away") return selectedTeams.includes(row["Away Team"]);
            if (teamFilterType === "All")
                return selectedTeams.includes(row["Home Team"]) || selectedTeams.includes(row["Away Team"]);
            return true;
        });
    };
    
    const filteredData = filterByTeam(
      selectedLeague ? data.filter(row => row.League === selectedLeague) : data
    );

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

        {/* League Filter */}
        <div className="mb-4">
            <select className="p-2 border bg-gray-800 text-white" onChange={(e) => setSelectedLeague(e.target.value)} value={selectedLeague}>
                <option value="">All Leagues</option>
                {data.length > 0 &&
                    [...new Set(data.map((row) => row.League))].map((league) => (
                        <option key={league} value={league}>{league}</option>
                    ))}
            </select>
        </div>

        {/* Select Teams Button */}
        <button 
            onClick={() => {
                if (!selectedLeague) {
                    alert("Please select a league first!");
                    return;
                }
                setModalOpen(true);
            }} 
            className="mb-4 p-2 border bg-gray-800 text-white rounded"
        >
            Select Teams
        </button>
        {/* Team Filter Type */}
        <div className="mb-4">
            <select className="p-2 border bg-gray-800 text-white" onChange={(e) => setTeamFilterType(e.target.value)} value={teamFilterType}>
                <option value="All">All Games</option>
                <option value="Home">Home Team</option>
                <option value="Away">Away Team</option>
            </select>
        </div>

        <button 
            onClick={clearFilters} 
            className="mb-4 p-2 border bg-red-600 text-white rounded hover:bg-red-700"
        >
            Clear Filters
        </button>

        {/* Modal for Selecting Teams */}
        {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-80 relative">
                    {/* Close Button */}
                    <button 
                        onClick={() => setModalOpen(false)} 
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                    >
                        ✖
                    </button>

                    <h2 className="text-lg font-semibold mb-4">Select Teams</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {uniqueTeams.map((team) => (
                            <label key={team} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedTeams.includes(team)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedTeams([...selectedTeams, team]);
                                        } else {
                                            setSelectedTeams(selectedTeams.filter((t) => t !== team));
                                        }
                                    }}
                                />
                                <span>{team}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={() => setModalOpen(false)} className="p-2 bg-blue-600 text-white rounded">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}

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
