import React from 'react'
import { Link } from 'react-router-dom'

import './home.scss'

const Home: React.FC = () => {
  return (
    <div className="home">
      <div className="home__title">
        <h1>COLOSSEUM</h1>
      </div>
      <div className="home__buttons">
        <Link to="/login">
          <div className="box btn-picture btn-picture-guide">
            <h2>GuideApp</h2>
          </div>
        </Link>
        <Link to="/map">
          <div className="box btn-picture btn-picture-user">
            <h2>MapApp</h2>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Home
