import React, { useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import StatisticBox from "./StatisticBox";
import useFetchEvents from "../api/teamup";
import moment from "moment";

function Summary() {
  const [selectedCategory, setSelectedCategory] = useState("majorChart");
  const [mode, setMode] = useState("today");
  const events = useFetchEvents();
  const [filters, setFilters] = useState({
    cpe: false,
    mcpe: false,
    isne: false,
    RoomReservation: false,
    Xternalmcpe: false,
    XternalUndergrad: false,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const getDatesForMode = (mode) => {
    const today = moment().startOf('day');
    const startOfWeek = moment().startOf('week');
    const endOfWeek = moment().endOf('week');
    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('month');

    switch (mode) {
      case "today":
        return { start: today, end: today.clone().endOf('day') };
      case "week":
        return { start: startOfWeek, end: endOfWeek };
      case "month":
        return { start: startOfMonth, end: endOfMonth };
      default:
        return { start: null, end: null };
    }
  };

  const { start, end } = getDatesForMode(mode);

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.checked,
    });
  };

  const filterEvents = (event) => {
    let include = true;
    if (filters.cpe && !event.title.includes("cpe")) include = false;
    if (filters.mcpe && !event.title.includes("mcpe")) include = false;
    if (filters.isne && !event.title.includes("isne")) include = false;
    if (filters.RoomReservation && !event.title.includes("Room reservation"))
      include = false;
    if (filters.Xternalmcpe && !event.title.includes("xternal mcpe"))
      include = false;
    if (filters.XternalUndergrad && !event.title.includes("xternal Undergrad"))
      include = false;
    return include;
  };

  const filteredEvents = events.filter((event) => {
    const eventDate = moment(event.start_dt);
    return (!start || !end || (eventDate.isBetween(start, end, null, '[]') && filterEvents(event)));
  });

  const roomUsage = filteredEvents.reduce((acc, event) => {
    const room = event.location || "No location specified";
    const title = event.title.toLowerCase();
    const major = title.includes("cpe")
      ? "CPE"
      : title.includes("mcpe")
      ? "MCPE"
      : title.includes("isne")
      ? "ISNE"
      : "OTHER";

    if (room !== "No location specified" && !room.includes("xxx")) {
      if (!acc[room]) {
        acc[room] = {
          total: 0,
          majors: { CPE: 0, MCPE: 0, ISNE: 0, OTHER: 0 },
        };
      }
      acc[room].total++;
      acc[room].majors[major]++;
    }
    return acc;
  }, {});

  const sortedRooms = Object.entries(roomUsage).sort(
    (a, b) => b[1].total - a[1].total
  );

  const chartData = {
    labels: sortedRooms.map(([room]) => room),
    datasets: [
      {
        label: "Room Usage",
        data: sortedRooms.map(([, usage]) => usage.total),
        backgroundColor: sortedRooms.map(
          (_, index) => `hsl(${index * 30}, 70%, 50%)`
        ),
      },
    ],
  };

  const majorUsage = Object.values(roomUsage).reduce(
    (acc, usage) => {
      Object.keys(usage.majors).forEach((major) => {
        if (!acc[major]) {
          acc[major] = 0;
        }
        acc[major] += usage.majors[major];
      });
      return acc;
    },
    { CPE: 0, MCPE: 0, ISNE: 0, OTHER: 0 }
  );

  const doughnutData = {
    labels: ["ISNE", "CPE", "MCPE", "OTHER"],
    datasets: [
      {
        label: "Major Usage",
        data: [
          majorUsage.ISNE,
          majorUsage.CPE,
          majorUsage.MCPE,
          majorUsage.OTHER,
        ],
        backgroundColor: ["#36a2eb", "#ff9f40", "#4bc0c0", "#ff6384"],
      },
    ],
  };

  const cpeCount = filteredEvents.filter((event) =>
    event.title.toLowerCase().includes("cpe")
  ).length;
  const mcpeCount = filteredEvents.filter((event) =>
    event.title.toLowerCase().includes("mcpe")
  ).length;
  const isneCount = filteredEvents.filter((event) =>
    event.title.toLowerCase().includes("isne")
  ).length;

  const majorchartData = {
    labels: ["ISNE", "CPE", "MCPE"],
    datasets: [
      {
        label: "Event Count",
        data: [isneCount, cpeCount, mcpeCount],
        backgroundColor: ["#36a2eb", "#ff9f40", "#4bc0c0"],
      },
    ],
  };

  const totalEventCount = filteredEvents.length;

  const totalRoomsUsed = Object.keys(roomUsage).length;
  const totalDuration = filteredEvents.reduce(
    (acc, event) => acc + (new Date(event.end_dt) - new Date(event.start_dt)),
    0
  );
  const averageEventDuration = (
    totalDuration /
    totalEventCount /
    1000 /
    60
  ).toFixed(2);

  const peakUsageHours = filteredEvents.reduce((acc, event) => {
    const startHour = new Date(event.start_dt).getHours();
    if (!acc[startHour]) {
      acc[startHour] = 0;
    }
    acc[startHour]++;
    return acc;
  }, {});

  const sortedPeakHours = Object.entries(peakUsageHours).sort(
    (a, b) => b[1] - a[1]
  );
  const topHour =
    sortedPeakHours.length > 0 ? parseInt(sortedPeakHours[0][0]) : null;
  const peakHourFormatted =
    topHour !== null
      ? `${topHour.toString().padStart(2, "0")}:00 - ${(topHour + 1) % 24}:00`
      : "N/A";

  const filteredEventsMorons = filteredEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.notes &&
        event.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.location &&
        event.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.who &&
        event.who.toLowerCase().includes(searchTerm.toLowerCase())) ||
      new Date(event.start_dt).toLocaleDateString().includes(searchTerm) ||
      new Date(event.start_dt).toLocaleTimeString().includes(searchTerm) ||
      new Date(event.end_dt).toLocaleTimeString().includes(searchTerm)
  );

  return (
    <div className="flex m-0 bg-[rgb(245,249,255) min-h-screen]">
      <main className="flex-1 pl-[150px] p-[20px] bg-[#e2e2eb]">
        <h1 className="mb-5 font-serif ml-5 text-4xl font-bold">
          Room Usage Summary
        </h1>
        <div className="flex bg-gray-400 mb-5 w-full h-12"></div>
        <div className="grid grid-cols-3 gap-4 items-center">
          <StatisticBox
            title="Total Event"
            value={totalEventCount}
            percentage={null}
          />
          <div className="flex items-center ml-4">
            <label htmlFor="modeSwitch" className="mr-2 text-xl font-medium">
              Mode:
            </label>
            <div className="relative">
              <input
                id="modeSwitch"
                type="checkbox"
                checked={mode === "today"}
                onChange={() => {
                  setMode(mode === "today" ? "week" : mode === "week" ? "month" : "today");
                }}
                className="sr-only"
              />
              <div
                onClick={() => {
                  setMode(mode === "today" ? "week" : mode === "week" ? "month" : "today");
                }}
                className="w-24 h-8 bg-gray-300 rounded-full cursor-pointer relative flex items-center"
              >
                <div
                  className={`w-8 h-8 bg-blue-600 rounded-full shadow-md absolute transition-transform duration-300 ${
                    mode === "today" ? "translate-x-0" : mode === "week" ? "translate-x-8" : "translate-x-16"
                  }`}
                ></div>
              </div>
            </div>
            <span className="ml-2">
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </span>
          </div>
        </div>
        <nav className="mb-5">
          <button
            onClick={() => setSelectedCategory("majorChart")}
            className={`mr-3 px-3 py-2 ${
              selectedCategory === "majorChart"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Event Count
          </button>
          <button
            onClick={() => setSelectedCategory("roomChart")}
            className={`mr-3 px-3 py-2 ${
              selectedCategory === "roomChart"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Room Usage Chart
          </button>
          <button
            onClick={() => setSelectedCategory("doughnutChart")}
            className={`mr-3 px-3 py-2 ${
              selectedCategory === "doughnutChart"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Major Usage
          </button>
          <button
            onClick={() => setSelectedCategory("statistic")}
            className={`mr-3 px-3 py-2 ${
              selectedCategory === "statistic"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Statistic
          </button>
        </nav>
        <div className="gap-32 p-5 flex h-[540px]">
          {selectedCategory === "majorChart" && (
            <div className="w-[800px] h-[500px]">
              <Bar data={majorchartData} />
            </div>
          )}
          {selectedCategory === "roomChart" && (
            <div className="w-[800px] h-[500px]">
              <Bar data={chartData} options={{ indexAxis: "y" }} />
            </div>
          )}
          {selectedCategory === "doughnutChart" && (
            <div className="w-[800px] h-[500px]">
              <Doughnut data={doughnutData} />
            </div>
          )}
          {selectedCategory === "statistic" && (
            <div className="w-[800px] h-[160px]">
              <div className="p-5 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Statistics</h2>
                <p>
                  <strong>Total Rooms Used:</strong> {totalRoomsUsed}
                </p>
                <p>
                  <strong>Average Event Duration:</strong>{" "}
                  {averageEventDuration} minutes
                </p>
                <p>
                  <strong>Peak Usage Hour:</strong> {peakHourFormatted}
                </p>
              </div>
            </div>
          )}
          
          <div class="w-auto h-[500px] overflow-y-scroll overflow-x-hidden">
            <ul className="list-none p-0 w-full max-w-xl">
              {filteredEventsMorons.map((event) => (
                <li
                  key={event.id}
                  className="bg-gray-100 p-4 mb-2 pr-12 rounded-sm shadow-sm flex justify-between items-center"
                >
                <div>
                    <h2 className="mb-[10px]">{event.title}</h2>
                    <p className="my-[5px]">
                      <strong>Date:</strong>{" "}
                      {new Date(event.start_dt).toLocaleDateString()}
                    </p>
                    <p className="my-[5px]">
                      <strong>Time:</strong>{" "}
                      {new Date(event.start_dt).toLocaleTimeString()} - {" "}
                      {new Date(event.end_dt).toLocaleTimeString()}
                    </p>
                    <p className="my-[5px]">
                      <strong>Location:</strong>{" "}
                      {event.location || "No location specified"}
                    </p>
                    <p className="my-[5px]">
                      <strong>Professor:</strong>{" "}
                      {event.who || "No professor specified"}
                    </p>
                  </div>
                  <button
                // Add a handler for the button click
                    className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                  >
                    +
                  </button>
                </li>
              ))}
            </ul> 
          </div>
        </div>
        <div className="w-full flex justify-center py-4">
          <input
            type="text"
            className="w-[400px] p-3 border items-center border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
            placeholder="Search events"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="justify-center w-[1000px] mx-auto mt-[20px] grid grid-cols-3 gap-4">
          {Object.keys(filters).map((filter) => (
            <label
              className="flex items-center space-x-3 p-2 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 transition gap-4"
              key={filter}
            >
              <input
                type="checkbox"
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                name={filter}
                checked={filters[filter]}
                onChange={handleFilterChange}
              />
              <span>{filter}</span>
            </label>
          ))}
        </div>

        

        
      </main>
    </div>
  );
}

export default Summary;
