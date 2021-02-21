import clsx from 'clsx'
import { FunctionComponent, h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import {
  SERVICES,
  SERVICE_IDS,
  ServiceId,
  getMatchingService,
} from '../../common/services'
import { isDefined } from '../../common/utils/types'
import { useAutoFill } from '../hooks/use-auto-fill'
import styles from './app.module.css'

export const App: FunctionComponent = () => {
  const autoFill = useAutoFill()

  const [url, setUrl] = useState('')
  const [selectedServiceId, setServiceId] = useState<ServiceId | undefined>(
    undefined
  )
  const [showMissingServiceError, setShowMissingServiceError] = useState(false)

  useEffect(() => {
    const service = getMatchingService(url)
    if (isDefined(service)) {
      setServiceId(service.id)
    }
  }, [url])

  useEffect(() => {
    if (isDefined(selectedServiceId)) {
      setShowMissingServiceError(false)
    }
  }, [selectedServiceId])

  return (
    <>
      <div className='submit_step_header'>
        Step 0: <span className='submit_step_header_title'>Import</span>
      </div>
      <div className='submit_step_box'>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (isDefined(selectedServiceId)) {
              void autoFill(url, selectedServiceId)
            } else {
              setShowMissingServiceError(true)
            }
          }}
        >
          <div className={styles.input}>
            <input
              type='url'
              value={url}
              required
              onInput={(event) =>
                setUrl((event.target as HTMLInputElement).value)
              }
            />
            <div className={styles.icons}>
              {SERVICE_IDS.map((id) => SERVICES[id]).map((service) => (
                <button
                  key={service.id}
                  type='button'
                  onClick={() => setServiceId(service.id)}
                  className={clsx(
                    styles.icon,
                    service.id === selectedServiceId && styles.selected
                  )}
                >
                  {service.icon({})}
                </button>
              ))}
            </div>
            {showMissingServiceError && (
              <div className={styles.error}>Select an import source</div>
            )}
          </div>
          <input type='submit' value='Import' className={styles.submit} />
        </form>
      </div>
    </>
  )
}
