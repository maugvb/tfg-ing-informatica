import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, GridItem } from '../../layout/Grid'
import './login.scss'
import '../../scss/button.scss'

const LoginGuide: React.FC = () => {
  const [name, setName] = useState<string>('')
  const navigate = useNavigate()
  const guideId = 'guide__'
  const [error, setError] = useState<any>()

  const onSumbitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if(!name.startsWith('guide__') || "guide__".length >= name.length) {
      setError("⚠️ Error: Este login es solo para guias");
    }else{
      setError('')
      setName(name)
      navigate('/chat?name=' + name)
    }
  }

  const onChangeNameInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setName(value)//value.length > 0 ? guideId+value : value)
  }

  const onClickHandler = (event: React.MouseEvent) => {
    event.preventDefault()
    navigate('/login')
  }

  return (
    <div className="login-grid">
      <Grid>
        <GridItem classItem="Login" title="Guide login">
          <>
            <div id="login" className="item__login">
              <form className="login__form" onSubmit={onSumbitForm}>
                <div className="mb-4">
                  <label htmlFor="inputName" className="form-label text-tertiary mb-2">
                    Username
                  </label>
                  <input id="inputName" className="form-control" type="text" onChange={onChangeNameInput} />
                </div>
                <span className='error'>{error}</span>

                <button className="btn button-primary w-100 mb-3" disabled={name === ''}>
                  Enter
                </button>
              </form>
            </div>
          </>
        </GridItem>
        <GridItem classItem="Actions" title="Actions">
          <div className="actions-panel">
            <button className="btn button-primary change-mode" onClick={onClickHandler}>
              Change to visitor
            </button>
          </div>
        </GridItem>
      </Grid>
    </div>
  )
}

export default LoginGuide
