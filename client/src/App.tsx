import React, { useState, useEffect } from 'react';
import socket from './socket';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Card, ListGroup } from 'react-bootstrap';
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
    axios.get(`${process.env.REACT_APP_API_URL}/api`)
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
                <ListGroup>
                  {Object.values(room.players).map((playerName, index) => (
                    <ListGroup.Item key={index}>{playerName}</ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
            <Button onClick={leaveRoom} className="mt-3" variant="danger">Leave Room</Button>
          </div>
          <div className="votes-container mt-4">
            <h3>Votes:</h3>
            <ListGroup>
              {Object.entries(room.votes).map(([playerId, vote], index) => (
                <ListGroup.Item key={index}>{room.players[playerId]}: {room.revealed ? vote : 'Hidden'}</ListGroup.Item>
              ))}
            </ListGroup>
          </div>
          <div className="vote-buttons mt-4">
            <h3>Your Vote: {selectedVote}</h3>
            <Row>
              {['0', '1', '2', '3', '5', '8', '13', '20', '40', '100'].map((vote, index) => (
                <Col key={index} xs={6} sm={4} md={2} className="mb-2">
                  <Button onClick={() => castVote(vote)} className="vote-button" variant="outline-primary">
                    <img src={`/images/cards/${vote}.png`} alt={`Vote ${vote}`} className="img-fluid" />
                  </Button>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}
      <div className="api-message mt-4">
        <h3>API Message:</h3>
        <p>{apiMessage}</p>
      </div>
    </Container>
  );
};

export default App;
