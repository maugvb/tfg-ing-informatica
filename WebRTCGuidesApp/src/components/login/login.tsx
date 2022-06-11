import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, GridItem } from '../../layout/Grid'
import './login.scss'
import '../../scss/button.scss'
import configData from '../../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : configData.DEV_SERVER_URL
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : configData.DEV_SERVER_PORT

const Login: React.FC = () => {
  const [name, setName] = useState<string>('')
  const [tagName, setTagName] = useState<string>('')
  const [errorName, setErrorName] = useState<any>()
  const navigate = useNavigate()

  const getUser = async (username: string) => {
    let u = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user/' + username, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    })
    let user = await u.json()
    return user
  }

  const getTag = async (tag_alias: string) => {
    let t = await fetch(SERVER_URL + ':' + SERVER_PORT + '/tag/' + tag_alias, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    })
    let tag = await t.json()
    return tag
  }
  const updateUsertag = async (username: string, tagAlias: string) => {
    //let user = await getUser(username)
    let user = {
      active: true,
      last_seen: JSON.stringify(new Date()),
      username: username
    }
    user['uwb_id'] = tagAlias
    user['active'] = true
    //console.log("USER UPDATE")
    //console.log(user)

    let added = false

    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user/' + name, {
      method: 'PUT', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      body: JSON.stringify(user)
    })
    //console.log(typeof(await r.json())=="string")
    return await r.json()
  }
  const setUser = async (username: string, tagAlias: string) => {
    //let user = await getUser(username)
    let user = {
      active: true,
      last_seen: JSON.stringify(new Date()),
      username: username
    }
    user['uwb_id'] = tagAlias
    user['active'] = true
    //console.log("USER UPDATE")
    //console.log(user)

    let r = await fetch(SERVER_URL + ':' + SERVER_PORT + '/user', {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      body: JSON.stringify(user)
    })
    //console.log(typeof(await r.json())=="string")
    return await r.json()
  }

  const onSumbitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (tagName === '' || tagName === undefined || name === '' || name === undefined) {
      setErrorName('⚠️ Error en inicio de sesión.')
    } else {
      let user = await getUser(name)
      let tag = await getTag(tagName)
      if (name.includes('guide__')) {
        setErrorName('⚠️ Error: No puede acceder con este login como guia a la aplicación')
      } else if (tag === undefined || tag['alias'] !== tagName) {
        setErrorName('⚠️ Error en inicio de sesión.')
      } else {
        if (user['active'] == false || user['active'] == undefined) {
          let r
          if (typeof user === 'object' && user['username'] === undefined) {
            r = await setUser(name, tagName)
          } else {
            r = await updateUsertag(name, tagName)
          }

          if (typeof r == 'string') {
            setErrorName('⚠️ Error en inicio de sesión.')
          } else {
            setErrorName('')
            navigate('/chat?name=' + name + (tagName !== '' ? '&tagName=' + tagName : ''))
          }
        } else {
          setErrorName('⚠️ Error en inicio de sesión.')
        }
      }
    }
  }

  const onChangeNameInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setName(value)
  }

  const onChangeTagNameInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setTagName(value)
  }

  const onClickHandler = (event: React.MouseEvent) => {
    event.preventDefault()
    navigate('/loginGuide')
  }
  const getAllTags = async () => {
    let tags = await fetch(SERVER_URL + ':' + SERVER_PORT + '/tag', {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    })

    return await tags.json()
  }
  useEffect(() => {
    const fakeTags = async () => {
      let tagsNumber = await getAllTags()
      if (tagsNumber.length === 0) {
        for (let i = 0; i < 4; i++) {
          let geoJson = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [-1.9864899047031321, 43.29264293442861]
            }
          }
          let coordinates = [
            [-1.9864899047031321, 43.29264293442861],
            [-1.9864940846403816, 43.2928428231813],
            [-1.9863900193639568, 43.292886802603306],
            [-1.9864050358373313, 43.2926586591943]
          ]
          let alias = ['tag1', 'tag2', 'tag3', 'tag4']

          let tagSchema = { tag_id: 1, coordinates: '', alias: 'tag1' }
          geoJson['geometry']['coordinates'] = coordinates[i]
          tagSchema['coordinates'] = JSON.stringify(geoJson)
          tagSchema['alias'] = alias[i]
          tagSchema['tag_id'] = i + 1

          let tagPost = await fetch(SERVER_URL + ':' + SERVER_PORT + '/tag', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json;',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            },
            body: JSON.stringify(tagSchema) // body data type must match "Content-Type" header
          })
        }
      }
    }

    fakeTags()
  })

  return (
    <div className="login-grid">
      <Grid>
        <GridItem classItem="Login" title="Login">
          <>
            <div id="login" className="item__login">
              <form className="login__form" onSubmit={onSumbitForm}>
                <div className="mb-4">
                  <label htmlFor="inputName" className="form-label text-tertiary mb-2">
                    Username
                  </label>
                  <input id="inputName" className="form-control" type="text" onChange={onChangeNameInput} />
                </div>
                <span className="error">{errorName}</span>
                <div className="mb-4">
                  <label htmlFor="inputName" className="form-label text-tertiary mb-2">
                    TagName
                  </label>
                  <input id="inputName" className="form-control" type="text" onChange={onChangeTagNameInput} />
                </div>
                <span className="error">{errorName}</span>

                <button className="btn button-primary w-100 mb-3" disabled={name === '' || tagName === ''}>
                  Enter
                </button>
              </form>
            </div>
          </>
        </GridItem>
        <GridItem classItem="Actions" title="Actions">
          <div className="actions-panel">
            <button className="btn button-primary change-mode" onClick={onClickHandler}>
              Change to guide
            </button>
          </div>
        </GridItem>
      </Grid>
    </div>
  )
}

export default Login
