import React, { useState } from 'react'
import ArtworkCanvas from './artwork'
import './artwork-selector.scss'

interface ComponentProps {
  goBack: () => void
}

const ArtworkSelector: React.FC<ComponentProps> = ({ goBack }) => {
  const [selection, setSelection] = useState<string>('')
  const [selected, setSelected] = useState<boolean>(false)

  const onValueChange = event => {
    const newSelection = event.target.value
    setSelection(newSelection)
  }

  const onClickContinue = () => {
    setSelected(true)
  }

  const onClickBack = () => {
    goBack()
  }

  return (
    <>
      {selected && <ArtworkCanvas artworkName={selection} goBack={goBack} />}
      {!selected && (
        <>
          <div className="form-check" onChange={onValueChange}>
            <input className="form-check-input" type="radio" value="starry_night" />
            <label className="form-check-label">Starry Night</label>
            <br />
            <input className="form-check-input" type="radio" value="the_scream" />
            <label className="form-check-label">The Scream</label>
            <br />
            <input className="form-check-input" type="radio" value="monalisa" />
            <label className="form-check-label">Monna Lisa</label>
            <br />
          </div>
          <button className="btn button-primary continue" onClick={onClickContinue}>
            Continue
          </button>
          <button className="btn button-primary back" onClick={onClickBack}>
            Go Back
          </button>
        </>
      )}
    </>
  )
}

export default React.memo(ArtworkSelector)
