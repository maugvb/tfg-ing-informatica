import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ChatRoom from './components/chat-room/chat-room'
import Login from './components/login/login'
import LoginGuide from './components/login/login-guide'
import MapComponent from './components/map/map-component'
import EditRooms from './components/editRooms/editRooms-component'
import './scss/app.scss'

const App: React.FC = () => {
  return (
    <Router>
      <main className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/loginGuide" element={<LoginGuide />} />
          <Route path="/chat" element={<ChatRoom />} />
          <Route path="/map" element={<MapComponent />} />
          <Route path="/editRooms" element={<EditRooms />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App
