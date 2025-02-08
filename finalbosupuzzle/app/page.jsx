// Import necessary dependencies and components
"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SquareMenu, ImageUp } from "lucide-react";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import supabase from "@/client/Supabase";

export default function Home() {
  // Define constants and state variables
  const gridSize = 3;
  const totalTiles = gridSize * gridSize;
  const [tiles, setTiles] = useState([]);
  const [emptyIndex, setEmptyIndex] = useState(totalTiles - 1);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [image, setImage] = useState(false);
  const [leaderboard,setLeaderboard]=useState([])
const [scoreData, setScoreData]=useState({
  name:'',
  score:""
})
  // Image dimensions
  const imageWidth = 600;
  const imageHeight = 800;
  const aspectRatio = imageWidth / imageHeight;

  // Container dimensions
  const containerWidth = 300;
  const containerHeight = containerWidth / aspectRatio;
  const tileWidth = containerWidth / gridSize;
  const tileHeight = containerHeight / gridSize;


  function calculateScore(moves, time) {
    const maxScore = 1000;
    const W_m = 4;  // Weight for moves
    const W_t = 2;  // Weight for time

    let score = maxScore - (W_m * moves + W_t * time);
    
    // Ensure score is between 0 and 1000
    return Math.max(0, Math.min(score, maxScore));
}

  // Initialize and shuffle tiles on component load
  useEffect(() => {
    const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);
    setTiles(initialTiles);

    const shuffleOnLoad = () => {
      let shuffled = [...initialTiles];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setTiles(shuffled);
      setEmptyIndex(shuffled.indexOf(totalTiles - 1));
      setMoves(0);
      setTimeElapsed(0);
      setTimerActive(true);
    };

    shuffleOnLoad();
  }, []);

  // Timer logic
  useEffect(() => {
    let timer;
    if (timerActive) {
      timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
  
   
  
      if (error) {
        console.error('Error fetching leaderboard:', error.message);
      } else {
        console.log('Leaderboard fetched successfully:');
        setLeaderboard(data);
      }
    };
  
    fetchLeaderboard();
  }, []);
  useEffect(() => {
    console.log(leaderboard[0]);
    
  }, [leaderboard])
  
  // Shuffle tiles manually
  const isSolvable = (tiles) => {
    let inversions = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (tiles[i] !== totalTiles - 1 && tiles[j] !== totalTiles - 1 && tiles[i] > tiles[j]) {
          inversions++;
        }
      }
    }
  
    if (gridSize % 2 !== 0) {
      return inversions % 2 === 0; // Odd grid: solvable if inversions are even
    } else {
      const emptyRow = Math.floor(emptyIndex / gridSize);
      return (inversions + emptyRow) % 2 === 0; // Even grid: check row parity
    }
  };
  
  const shuffleTiles = () => {
    setIsSolved(false);
    let shuffled;
  
    do {
      shuffled = Array.from({ length: totalTiles }, (_, i) => i);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } while (!isSolvable(shuffled)); // Keep shuffling until we get a solvable one
  
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(totalTiles - 1));
    setMoves(0);
    setTimeElapsed(0);
    setTimerActive(true);
  };

  // Check if the puzzle is solved
  const checkSolved = () => {
    if (tiles.every((tile, index) => tile === index)) {
      setIsSolved(true);
      setTimerActive(false);
      setScoreData({
        ...scoreData,
        score:calculateScore(moves,timeElapsed)
      })
      
      console.log(scoreData,moves,timeElapsed);
      
    }
  };

  // Handle tile click events
  const handleTileClick = (index) => {
    const validMoves = getValidMoves(emptyIndex);
    if (validMoves.includes(index)) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      setEmptyIndex(index);
      setMoves((prev) => prev + 1);
      checkSolved();
    }
  };

  // Determine valid moves for the empty tile
  const getValidMoves = (emptyIndex) => {
    const row = Math.floor(emptyIndex / gridSize);
    const col = emptyIndex % gridSize;
    const moves = [];
    if (row > 0) moves.push(emptyIndex - gridSize);
    if (row < gridSize - 1) moves.push(emptyIndex + gridSize);
    if (col > 0) moves.push(emptyIndex - 1);
    if (col < gridSize - 1) moves.push(emptyIndex + 1);
    return moves;
  };
  const saveScore=async(name,score)=>{
    const{data,error}= await supabase
    .from('leaderboard')
    .insert([{name,score}]);

    if (error) {
      console.error("Error saving score", error.message)
    } else {
      console.log("score save succesfully");
      
    }
  }


  const handlechange=(e)=>{
    setScoreData({
      ...scoreData,
      [e.target.name]:e.target.value
    })
  }

  return (
    <div className=" relative min-h-screen text-[#e61949] bg-black bg-bluenoise-layer justify-center items-center flex">
      {/* Main container */}
      <div className="flex flex-col items-center justify-center">
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
            <Image src="/puzzle-image.jpg" fill className={`z-10 ${image ? "block" : "hidden"}`} />

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
                    backgroundPosition: `${(tile % gridSize) * (100 / (gridSize - 1))}% ${(Math.floor(tile / gridSize) * 100) / (gridSize - 1)}%`,
                  }}
                ></div>
              );
            })}
          </div>



          {/* Buttons */}
          <div className="flex gap-8 text-black pt-6">
            <Button variant="outline" onClick={shuffleTiles}>Shuffle</Button>

            <Button onClick={shuffleTiles} variant="outline">
              Change <br /> Image
            </Button>

            <Button
              variant="outline"
              onClick={() => setImage(!image)}
            >
              {image ? "Close" : "Show"} <br /> Original
            </Button>
          </div>



          {/* Side Menu */}
          <Sheet>
            <SheetTrigger className="absolute right-8 text-white top-8">
              <SquareMenu size={80} />
            </SheetTrigger>
            <SheetContent className="">
              <div className="flex flex-col gap-10 h-full">


                {/* Community Fan Arts Section */}
                <div className="flex flex-col gap-6">
                  <div className="font-anton font-bold text-2xl pt-8">PLAY WITH COMMUNITY FAN ARTS</div>
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
                      <CarouselContent className="">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                              <Card>
                                <CardContent className="flex aspect-square items-center justify-center p-6">
                                  <span className="text-3xl font-semibold">{index + 1}</span>
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
                  <div className="font-anton font-bold text-2xl">OR PLAY WITH YOURS</div>
                  <Button variant="outline" className="self-start bg-black text-white">
                    <ImageUp /> Upload
                  </Button>
                </div>



                {/* Leaderboard Section */}
                <div className="">
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
                        {leaderboard?.map(leaderboard => (
                          <TableRow key={leaderboard?.id}>
                            <TableCell className="font-medium">{leaderboard?.name}</TableCell>
                            <TableCell>{leaderboard?.score}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>



          {/* Success Message */}
          {isSolved && (
         <div className=" text-white flex flex-col bg-black font-poppins rounded w-[300px] h-[300px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2  p-4 z-10  ">
          <div className="flex flex-col gap-2">
          <div className="text-xl font-semibold ">Congratulations🎊</div>
          <div className=" text-xs text-gray-500">You solved the puzzle in 1min 10sec with 32 moves</div>
          </div>
          <div className="text-gray-700 text-sm">you scored {scoreData.score===''?0:scoreData.score}</div>
          <div className="my-3 text-xs">Type in your name and upload your score to see where you rank among other finalbosu community members </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-bold">Name <span className="text-gray-700 text-xs font-thin">(twitter username)</span></label>
              <input className="bg-transparent border rounded border-gray-700 outline-none p-2 text-xs" type="text" name="name" value={scoreData.name} onChange={handlechange} />
            </div>
            <Button className='self-end mt-auto' onClick={()=>saveScore(scoreData.name,scoreData.score)}>Upload</Button>
         </div>
          )}
        </div>
      </div>
    </div>
  );
}
