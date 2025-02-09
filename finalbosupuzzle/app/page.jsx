"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, ImageUp, Loader2, SquareX } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import supabase from "@/client/Supabase";

export default function Home() {
  // Constants and state variables
  const gridSize = 3;
  const totalTiles = gridSize * gridSize;
  const [tiles, setTiles] = useState([]);
  const [emptyIndex, setEmptyIndex] = useState(totalTiles - 1);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  // New state: game starts paused (isPlaying=false means paused)
  const [isPlaying, setIsPlaying] = useState(false);
  const [image, setImage] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [uploadbutton, setuploadbutton] = useState("idle");
  const [scoreData, setScoreData] = useState({ name: "", score: "" });
  // New state for the win modal
  const [showModal, setShowModal] = useState(false);

  // Image and container dimensions
  const imageWidth = 600;
  const imageHeight = 800;
  const aspectRatio = imageWidth / imageHeight;
  const containerWidth = 300;
  const containerHeight = containerWidth / aspectRatio;
  const tileWidth = containerWidth / gridSize;
  const tileHeight = containerHeight / gridSize;

  function calculateScore(moves, time) {
    const maxScore = 1000;
    const W_m = 4; // Weight for moves
    const W_t = 2; // Weight for time
    let score = maxScore - (W_m * moves + W_t * time);
    return Math.max(0, Math.min(score, maxScore));
  }

  // Function to shuffle tiles and reset the game (starting paused)
  const shuffleTiles = () => {
    setIsSolved(false);
    let shuffled;
    do {
      shuffled = Array.from({ length: totalTiles }, (_, i) => i);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } while (!isSolvable(shuffled));
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(totalTiles - 1));
    setMoves(0);
    setTimeElapsed(0);
    // Reset to paused state—user must click Play
    setIsPlaying(false);
    setShowModal(false);
  };

  // On load, shuffle the puzzle but keep it paused
  useEffect(() => {
    const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);
    let shuffled = [...initialTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(totalTiles - 1));
    setMoves(0);
    setTimeElapsed(0);
    setIsPlaying(false);
  }, []);

  // Timer: only runs when the game is playing
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false })
        .limit(5);
      if (error) {
        console.error("Error fetching leaderboard:", error.message);
      } else {
        setLeaderboard(data);
      }
    };
    fetchLeaderboard();
  }, []);

  // Check if the puzzle is solvable
  const isSolvable = (tilesArray) => {
    let inversions = 0;
    for (let i = 0; i < tilesArray.length - 1; i++) {
      for (let j = i + 1; j < tilesArray.length; j++) {
        if (
          tilesArray[i] !== totalTiles - 1 &&
          tilesArray[j] !== totalTiles - 1 &&
          tilesArray[i] > tilesArray[j]
        ) {
          inversions++;
        }
      }
    }
    if (gridSize % 2 !== 0) {
      return inversions % 2 === 0;
    } else {
      const emptyRow = Math.floor(emptyIndex / gridSize);
      return (inversions + emptyRow) % 2 === 0;
    }
  };

  // When the puzzle is solved, pause the game and show the modal.
  useEffect(() => {
    if (moves > 0 && tiles.every((tile, index) => tile === index)) {
      setIsSolved(true);
      setIsPlaying(false);
      setScoreData((prevData) => ({
        ...prevData,
        score: calculateScore(moves, timeElapsed),
      }));
      setShowModal(true);
    }
  }, [tiles]);

  // Handle tile clicks only if the game is playing and unsolved.
  const handleTileClick = (index) => {
    if (!isPlaying || isSolved) return;
    const validMoves = getValidMoves(emptyIndex);
    if (validMoves.includes(index)) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [
        newTiles[emptyIndex],
        newTiles[index],
      ];
      setTiles(newTiles);
      setEmptyIndex(index);
      setMoves((prev) => prev + 1);
    }
  };

  // Determine valid moves for the empty tile
  const getValidMoves = (emptyIdx) => {
    const row = Math.floor(emptyIdx / gridSize);
    const col = emptyIdx % gridSize;
    const movesArr = [];
    if (row > 0) movesArr.push(emptyIdx - gridSize);
    if (row < gridSize - 1) movesArr.push(emptyIdx + gridSize);
    if (col > 0) movesArr.push(emptyIdx - 1);
    if (col < gridSize - 1) movesArr.push(emptyIdx + 1);
    return movesArr;
  };

  const saveScore = async (name, score) => {
    setuploadbutton("loading");
    const { data, error } = await supabase
      .from("leaderboard")
      .insert([{ name, score }]);
    if (error) {
      console.error("Error saving score", error.message);
    } else {
      setuploadbutton("success");
    }
  };

  const handlechange = (e) => {
    setScoreData({
      ...scoreData,
      [e.target.name]: e.target.value,
    });
  };

  // Play/Pause button handler.
  // If the puzzle is solved, clicking "New Game" (i.e. Play) will reset the board.
  const handlePlayPause = () => {
    if (isSolved) {
      shuffleTiles();
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  // When the win modal is cancelled, just hide the modal and leave the board solved.
  const handleModalCancel = () => {
    setShowModal(false);
  };

  return (
    <div className="relative min-h-screen text-[#e61949] bg-black bg-bluenoise-layer flex justify-center items-center">
      {/* Main container */}
      <div className="flex flex-col items-center justify-center">
        {/* Title Section */}
        <div className="text-7xl font-anton">FINALBOSU</div>
        <h1 className="text-sm font-poppins italic">Sliding Puzzle Game</h1>

        {/* Stats Section */}
        <div className="flex justify-between w-64 mb-4 font-poppins">
          <p className="text-sm">Moves: {moves}</p>
          <p className="text-sm">Time: {timeElapsed}s</p>
        </div>

        {/* Puzzle Grid */}
        <div
          className="relative bg-gray-800 border overflow-hidden border-white"
          style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
        >
          {/* Original Image Overlay */}
          <Image
            src="/puzzle-image.jpg"
            fill
            alt="Puzzle overlay"
            className={`z-10 ${image ? "block" : "hidden"}`}
          />

          {/* Tiles */}
          {tiles.map((tile, index) => {
            const left = (index % gridSize) * tileWidth;
            const top = Math.floor(index / gridSize) * tileHeight;
            return (
              <div
                key={index}
                className={`absolute ${
                  tile === totalTiles - 1 ? "opacity-0 cursor-default" : "cursor-pointer"
                }`}
                onClick={() => handleTileClick(index)}
                style={{
                  width: `${tileWidth}px`,
                  height: `${tileHeight}px`,
                  left: `${left}px`,
                  top: `${top}px`,
                  backgroundImage: tile !== totalTiles - 1 ? "url('/puzzle-image.jpg')" : "",
                  backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                  backgroundPosition: `${
                    (tile % gridSize) * (100 / (gridSize - 1))
                  }% ${Math.floor(tile / gridSize) * (100 / (gridSize - 1))}%`,
                }}
              ></div>
            );
          })}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-8 text-black pt-6 font-poppins">
          <Button variant="outline" onClick={shuffleTiles}>
            Reset
          </Button>
          <Button variant="outline" onClick={handlePlayPause}>
            {isSolved
              ? "New Game"
              : isPlaying
              ? "Pause"
              : "Play"}
          </Button>
          <Button variant="outline" onClick={() => setImage(!image)}>
            {image ? "Close" : "Original"}
          </Button>
        </div>

        {/* Side Menu */}
        <Sheet>
          <SheetTrigger className="absolute right-4 text-white top-4">
            <Menu size={40} />
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-10 h-full">
              {/* Community Fan Arts Section */}
              <div className="flex flex-col gap-6">
                <div className="font-anton font-bold text-2xl pt-8">
                  PLAY WITH COMMUNITY FAN ARTS
                </div>
                <div className="flex justify-center">
                  <Carousel
                    plugins={[
                      Autoplay({
                        delay: 2000,
                      }),
                    ]}
                    opts={{ align: "start" }}
                    className="w-[80%]"
                  >
                    <CarouselContent>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                          <div className="p-1">
                            <Card>
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <span className="text-3xl font-semibold">
                                  {index + 1}
                                </span>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              </div>

              {/* Upload Section */}
              <div className="flex flex-col gap-2">
                <div className="font-anton font-bold text-2xl">
                  OR PLAY WITH YOURS
                </div>
                <Button variant="outline" className="self-start bg-black text-white">
                  <ImageUp /> Upload
                </Button>
              </div>

              {/* Leaderboard Section */}
              <div>
                <div className="font-anton font-bold text-3xl">LEADERBOARD</div>
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Name</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard?.map((lb) => (
                        <TableRow key={lb?.id}>
                          <TableCell className="font-medium">{lb?.name}</TableCell>
                          <TableCell>{lb?.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Success Modal */}
        {isSolved && showModal && (
          <div className="text-white flex flex-col bg-black font-poppins rounded w-[300px] h-[300px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 z-10">
            <Button
              className="absolute right-2 bg-black top-2 w-4"
              onClick={handleModalCancel}
            >
              <SquareX size={10} />
            </Button>
            <div className="flex flex-col gap-2">
              <div className="text-xl font-semibold">Congratulations 🎊</div>
              <div className="text-xs text-gray-500">
                You solved the puzzle in {timeElapsed} sec with {moves} moves
              </div>
            </div>
            <div className="text-gray-700 text-sm">
              You scored {scoreData.score === "" ? 0 : scoreData.score}
            </div>
            <div className="my-3 text-xs">
              Type in your name and upload your score to see where you rank among other finalbosu community members
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-bold">
                Name{" "}
                <span className="text-gray-700 text-xs font-thin">
                  (twitter username)
                </span>
              </label>
              <input
                className="bg-transparent border rounded border-gray-700 outline-none p-2 text-xs"
                type="text"
                name="name"
                value={scoreData.name}
                onChange={handlechange}
              />
            </div>
            <Button
              className={`self-end mt-auto ${
                uploadbutton === "success" ? "bg-green-500" : "bg-auto"
              }`}
              disabled={uploadbutton === "success" || uploadbutton === "loading"}
              onClick={() => saveScore(scoreData.name, scoreData.score)}
            >
              {uploadbutton === "loading" ? (
                <>
                  <Loader2 className="animate-spin" /> Please wait
                </>
              ) : uploadbutton === "idle" ? (
                <>Upload</>
              ) : (
                <>Uploaded</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
