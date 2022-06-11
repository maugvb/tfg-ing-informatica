import { isHttps } from '.'
import { JanusClient } from './janus/janus-client'

import configData from '../../config.json'
const SERVER_URL = configData.PROD ? configData.SERVER_URL : 'http://localhost'
const SERVER_PORT = configData.PROD ? configData.SERVER_PORT : '8088'

class UserService {
  static instance: UserService
  static janusClient: JanusClient | undefined

  private constructor () {}

  // Invoke the singleton
  public static getInstance (): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  public static getJanusClient (): JanusClient {
    if (!UserService.janusClient) {
      // TODO Switch to ws eventually
      // const protocol = isHttps() ? 'wss' : 'ws'
      // const port = isHttps() ? 8989 : 8188

      // HTTP
      // const protocol = isHttps() ? 'https' : 'http'
      // const port = isHttps() ? 8089 : 8088

      // const janusUrl = `${protocol}://${window.location.hostname}:${port}/janus`
      //for dev version
      // const janusUrlArray = [ `http://${window.location.hostname}:8088/janus` ]
      //For build version
      const janusUrlArray = [ `${SERVER_URL}:${SERVER_PORT}/janus` ]
      UserService.janusClient = new JanusClient(janusUrlArray)
    }
    return UserService.janusClient
  }

  public static destroyJanusClient (): void {
    UserService.janusClient = undefined
  }
}

export default UserService
