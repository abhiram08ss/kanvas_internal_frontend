import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

/** Owns the login form's fields and submit flow; navigates to the dashboard on success. */
export function useLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setSubmitting(true)
    const failure = await login(username, password)
    setSubmitting(false)
    if (failure === null) {
      navigate('/', { replace: true })
    } else {
      setError(failure)
    }
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    remember,
    setRemember,
    error,
    submitting,
    handleSubmit,
  }
}
