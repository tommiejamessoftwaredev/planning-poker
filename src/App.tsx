import React, { useState, useEffect } from 'react';
import socket from './socket';
import axios from 'axios';

interface Room {
  host: string;
  players: { [key: string]: string };
  votes: { [key: string]: string };
  revealed: boolean;
}

const App: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [message, setMessage] = useState<string>('');
  const [apiMessage, setApiMessage] = useState<string>('');
  const [selectedVote, setSelectedVote] = useState<string>('');

  useEffect(() => {
    socket.on('room-created', ({ roomCode, playerName }) => {
      setRoomCode(roomCode);
      setPlayerName(playerName);
    });

    socket.on('room-joined', ({ roomCode, playerName }) => {
      setRoomCode(roomCode);
      setPlayerName(playerName);
    });

    socket.on('room-updated', (room: Room) => {
      setRoom(room);
      if (socket.id && room.votes[socket.id]) {
        setSelectedVote(room.votes[socket.id]);
      }
    });

    socket.on('room-reset', () => {
      setSelectedVote('');
    });

    socket.on('room-closed', () => {
      alert('The host has left the room. You have been removed from the room.');
      handleLeaveRoom();
    });

    socket.on('message', (message: string) => {
      setMessage(message);
    });

    socket.on('error', (error: string) => {
      alert(error);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('room-reset');
      socket.off('room-closed');
      socket.off('message');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    axios.get('http://localhost:4000/api')
      .then(response => {
        setApiMessage(response.data.message);
      })
      .catch(error => {
        console.error('There was an error making the GET request!', error);
      });
  }, []);

  const createRoom = () => {
    if (playerName) {
      socket.emit('create-room', { playerName });
    } else {
      alert('Please enter a player name.');
    }
  };

  const joinRoom = () => {
    if (roomCode && playerName) {
      socket.emit('join-room', { roomCode, playerName });
    } else {
      alert('Please enter a room code and player name.');
    }
  };

  const castVote = (vote: string) => {
    if (!room?.revealed) {
      setSelectedVote(vote);
      socket.emit('vote', vote);
    } else {
      alert('Votes have been revealed, you cannot change your vote.');
    }
  };

  const revealVotes = () => {
    if (room) {
      const allPlayersVoted = Object.keys(room.players).length === Object.keys(room.votes).length;
      if (allPlayersVoted) {
        socket.emit('reveal-votes');
      } else {
        alert('Not all players have voted.');
      }
    }
  };

  const resetRoom = () => {
    setSelectedVote('');
    socket.emit('reset-room');
  };

  const handleLeaveRoom = () => {
    setRoomCode('');
    setRoom(null);
    setSelectedVote('');
  };

  const leaveRoom = () => {
    socket.emit('leave-room');
    handleLeaveRoom();
  };

  return (
    <div>
      <h1>Planning Poker</h1>
      {!room ? (
        <div>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter player name"
          />
          <button onClick={createRoom}>Host Room</button>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <h2>Room Code: {roomCode}</h2>
          <p>{message}</p>
          <div>
            {room.host === socket.id && (
              <div>
                <button onClick={revealVotes} disabled={Object.keys(room.players).length !== Object.keys(room.votes).length}>
                  Reveal Votes
                </button>
                <button onClick={resetRoom}>Reset Room</button>
                <h3>Players:</h3>
                <ul>
                  {Object.values(room.players).map((playerName, index) => (
                    <li key={index}>{playerName}</li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={leaveRoom}>Leave Room</button>
          </div>
          <div>
            <h3>Votes:</h3>
            <ul>
              {Object.entries(room.votes).map(([playerId, vote], index) => (
                <li key={index}>{room.players[playerId]}: {room.revealed ? vote : 'Hidden'}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Your Vote: {selectedVote}</h3>
            <button onClick={() => castVote('0')}>0</button>
            <button onClick={() => castVote('1')}>1</button>
            <button onClick={() => castVote('2')}>2</button>
            <button onClick={() => castVote('3')}>3</button>
            <button onClick={() => castVote('5')}>5</button>
            <button onClick={() => castVote('8')}>8</button>
            <button onClick={() => castVote('13')}>13</button>
            <button onClick={() => castVote('20')}>20</button>
            <button onClick={() => castVote('40')}>40</button>
            <button onClick={() => castVote('100')}>100</button>
          </div>
        </div>
      )}
      <div>
        <h3>API Message:</h3>
        <p>{apiMessage}</p>
      </div>
    </div>
  );
};

export default App;
