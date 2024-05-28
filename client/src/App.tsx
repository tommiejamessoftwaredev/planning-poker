import React, { useState, useEffect } from 'react';
import socket from './socket';
import axios from 'axios';
import { Container, Row, Col, Form, Button, ListGroup } from 'react-bootstrap';
import './App.css';

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
  const [selectedVote, setSelectedVote] = useState<string>('');
  const [averageVote, setAverageVote] = useState<number | null>(null);

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
      setAverageVote(null);
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
    axios.get(`${process.env.REACT_APP_API_URL}/api`)
      .then(response => {
        console.log(response.data.message);
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
    if (selectedVote === vote) {
      setSelectedVote('');
      socket.emit('vote', '');
    } else {
      setSelectedVote(vote);
      socket.emit('vote', vote);
    }
  };

  const revealVotes = () => {
    if (room) {
      const allPlayersVoted = Object.keys(room.players).length === Object.keys(room.votes).length;
      if (allPlayersVoted) {
        socket.emit('reveal-votes');
        const votes = Object.values(room.votes).map(vote => parseInt(vote));
        const average = votes.reduce((a, b) => a + b, 0) / votes.length;
        setAverageVote(average);
      } else {
        alert('Not all players have voted.');
      }
    }
  };

  const resetRoom = () => {
    setSelectedVote('');
    setAverageVote(null);
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
    <Container className="app-container">
      <h1 className="text-center my-4">Planning Poker</h1>
      {!room ? (
        <div className="room-form">
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
            />
          </Form.Group>
          <Button onClick={createRoom} className="mb-3" variant="primary">Host Room</Button>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Enter room code"
            />
          </Form.Group>
          <Button onClick={joinRoom} className="mb-3" variant="primary">Join Room</Button>
        </div>
      ) : (
        <div className="room-container">
          <h2>Room Code: {roomCode}</h2>
          <p>{message}</p>
          <div>
            {room.host === socket.id && (
              <div className="host-controls">
                <Button onClick={revealVotes} className="mb-3" variant="success" disabled={Object.keys(room.players).length !== Object.keys(room.votes).length}>
                  Reveal Votes
                </Button>
                <Button onClick={resetRoom} className="mb-3" variant="warning">Reset Room</Button>
                <h3>Players:</h3>
                <ListGroup className="players-list">
                  {Object.entries(room.players).map(([playerId, playerName], index) => (
                    <ListGroup.Item key={index} className="d-flex align-items-center justify-content-center">
                      <img src={`/images/cards/${room.votes[playerId] || 'back'}.png`} alt={`Card of ${playerName}`} className={`player-card ${room.revealed ? 'revealed' : ''}`} />
                      {playerName}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </div>
          {room.revealed && averageVote !== null && (
            <div className="average-vote">
              <h3>Average Vote: {averageVote.toFixed(2)}</h3>
            </div>
          )}
          <div className="vote-buttons mt-4">
            <Row>
              {['0', '1', '2', '3', '5', '8', '13', '20', '40', '100'].map((vote, index) => (
                <Col key={index} xs={4} sm={3} md={2} className="mb-2">
                  <Button onClick={() => castVote(vote)} className={`vote-button ${selectedVote === vote ? 'selected' : ''}`} variant="outline-primary" disabled={room.revealed}>
                    <img src={`/images/cards/${vote}.png`} alt={`Vote ${vote}`} className="img-fluid" />
                  </Button>
                </Col>
              ))}
            </Row>
          </div>
          <Button onClick={leaveRoom} className="mt-3 mb-3" variant="danger">Leave Room</Button>
        </div>
      )}
    </Container>
  );
};

export default App;
