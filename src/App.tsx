import { useState, useEffect, useCallback, useRef } from 'react';

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type Difficulty = 'easy' | 'medium' | 'hard';

const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 180,
  medium: 120,
  hard: 75,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function getRandomFood(snake: Position[]): Position {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
  return food;
}

function getHighScore(): number {
  try {
    return parseInt(localStorage.getItem('snake-high-score') || '0', 10);
  } catch {
    return 0;
  }
}

function setHighScore(score: number): void {
  try {
    localStorage.setItem('snake-high-score', score.toString());
  } catch {
    // localStorage not available
  }
}

export default function App() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomFood(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore());
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [newHighScore, setNewHighScore] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameLoopRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastDirectionRef = useRef<Direction>('RIGHT');

  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    lastDirectionRef.current = 'RIGHT';
    setScore(0);
    setNewHighScore(false);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setGameState('PLAYING');
  }, [resetGame]);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const changeDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== lastDirectionRef.current) {
      directionRef.current = newDir;
      setDirection(newDir);
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = window.setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const dir = directionRef.current;
        lastDirectionRef.current = dir;

        switch (dir) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameState('GAME_OVER');
          setScore(s => {
            const hs = getHighScore();
            if (s > hs) {
              setHighScore(s);
              setHighScoreState(s);
              setNewHighScore(true);
            }
            return s;
          });
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          setGameState('GAME_OVER');
          setScore(s => {
            const hs = getHighScore();
            if (s > hs) {
              setHighScore(s);
              setHighScoreState(s);
              setNewHighScore(true);
            }
            return s;
          });
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food collision
        setFood(prevFood => {
          if (head.x === prevFood.x && head.y === prevFood.y) {
            setScore(s => s + (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1));
            const newFood = getRandomFood(newSnake);
            return newFood;
          } else {
            newSnake.pop();
            return prevFood;
          }
        });

        return newSnake;
      });
    }, SPEEDS[difficulty]);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, difficulty]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (gameState === 'PLAYING') changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (gameState === 'PLAYING') changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (gameState === 'PLAYING') changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (gameState === 'PLAYING') changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameState === 'PLAYING' || gameState === 'PAUSED') togglePause();
          else if (gameState === 'IDLE' || gameState === 'GAME_OVER') startGame();
          break;
        case 'Escape':
          e.preventDefault();
          if (gameState === 'PLAYING') togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, changeDirection, togglePause, startGame]);

  // Touch controls (swipe)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'PLAYING') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [gameState, changeDirection]);

  // Render the board
  const renderBoard = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isHead = snake[0].x === x && snake[0].y === y;
        const isBody = !isHead && snake.some(s => s.x === x && s.y === y);
        const isFood = food.x === x && food.y === y;

        let cellClass = 'cell ';
        if (isHead) cellClass += 'cell-snake-head';
        else if (isBody) cellClass += 'cell-snake-body';
        else if (isFood) cellClass += 'cell-food';
        else cellClass += 'cell-empty';

        cells.push(<div key={`${x}-${y}`} className={cellClass} />);
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4 animate-slide-up">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
          🐍 Snake
        </h1>

        {/* Score bar */}
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Score</div>
            <div className="score-display">{score}</div>
          </div>
          <div className="flex gap-1">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => {
                  if (gameState !== 'PLAYING') setDifficulty(d);
                }}
                className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
                disabled={gameState === 'PLAYING'}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Best</div>
            <div className="high-score-display">{highScore}</div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        className="relative w-full max-w-lg animate-fade-in"
        style={{ ['--grid-size' as string]: GRID_SIZE }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="game-board">
          {renderBoard()}
        </div>

        {/* Overlays */}
        {gameState === 'IDLE' && (
          <div className="overlay animate-fade-in">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🐍</div>
              <h2 className="text-xl font-bold text-white mb-2">Ready to Play?</h2>
              <p className="text-slate-400 text-sm mb-4">
                Use arrow keys, WASD, or swipe to move
              </p>
              <button onClick={startGame} className="btn-game btn-primary">
                Start Game
              </button>
              <p className="text-slate-500 text-xs mt-3">Press Space to start</p>
            </div>
          </div>
        )}

        {gameState === 'PAUSED' && (
          <div className="overlay animate-fade-in">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">⏸️</div>
              <h2 className="text-xl font-bold text-white mb-2">Paused</h2>
              <div className="flex gap-3 justify-center">
                <button onClick={togglePause} className="btn-game btn-primary">
                  Resume
                </button>
                <button onClick={startGame} className="btn-game btn-secondary">
                  Restart
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-3">Press Space to resume</p>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="overlay animate-fade-in">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">💀</div>
              <h2 className="text-xl font-bold text-white mb-1">Game Over</h2>
              <p className="text-slate-300 text-lg mb-1">Score: <span className="font-bold text-cyan-400">{score}</span></p>
              {newHighScore && (
                <p className="text-amber-400 font-semibold text-sm mb-2 animate-pulse">
                  🏆 New High Score!
                </p>
              )}
              <div className="flex gap-3 justify-center mt-3">
                <button onClick={startGame} className="btn-game btn-primary">
                  Play Again
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-3">Press Space to restart</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4 animate-slide-up">
        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          {gameState === 'PLAYING' && (
            <button onClick={togglePause} className="btn-game btn-secondary">
              ⏸ Pause
            </button>
          )}
          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <button onClick={startGame} className="btn-game btn-danger">
              ↺ Restart
            </button>
          )}
        </div>

        {/* Touch D-pad for mobile */}
        <div className="flex justify-center md:hidden">
          <div className="grid grid-cols-3 gap-1.5 w-fit">
            <div></div>
            <button
              className="touch-control"
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') changeDirection('UP'); }}
            >
              ▲
            </button>
            <div></div>
            <button
              className="touch-control"
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') changeDirection('LEFT'); }}
            >
              ◀
            </button>
            <button
              className="touch-control"
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') togglePause(); }}
            >
              {gameState === 'PLAYING' ? '⏸' : '▶'}
            </button>
            <button
              className="touch-control"
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') changeDirection('RIGHT'); }}
            >
              ▶
            </button>
            <div></div>
            <button
              className="touch-control"
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'PLAYING') changeDirection('DOWN'); }}
            >
              ▼
            </button>
            <div></div>
          </div>
        </div>

        {/* Desktop hint */}
        <div className="hidden md:flex justify-center mt-2">
          <div className="flex gap-4 text-xs text-slate-500">
            <span>↑↓←→ or WASD to move</span>
            <span>Space to pause</span>
            <span>Esc to pause</span>
          </div>
        </div>
      </div>
    </div>
  );
}
