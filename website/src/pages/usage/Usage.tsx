import { useEffect, useState } from 'react'
import { Divider, Grid, Typography } from '@mui/material'
import { CircularProgressWithLabel } from '../../components/ui/CircularProgressWithLabel'
import { addAndRemoveErrorAlert } from '../../store/alertSlice'
import { useDispatch } from 'react-redux'
import { fetchAuthSession } from 'aws-amplify/auth'

export type Usage = {
  date: Date
  tokensUsed: number
}

export function Usage() {
  const [monthlyAllowance, setMonthlyAllowance] = useState<number>(0)
  const [usage, setUsage] = useState<Usage[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const dispatch = useDispatch()

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  useEffect(() => {
    fetchAuthSession().then((authSession) => {
      fetch('/api/admin/usage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          Authorization: authSession.tokens.idToken.toString(),
        },
      })
        .then((response) => response.json())
        .then((data) => {
          const usageWithDates: Usage[] = data.usage.map((usage: any) => ({
            ...usage,
            date: new Date(usage.date),
          }))
          usageWithDates.sort((a, b) => b.date.getTime() - a.date.getTime())
          setUsage(usageWithDates)
          setMonthlyAllowance(data.monthlyAllowance)
          setLoading(false)
        })
        .catch((error) => {
          console.error('Error:', error)
          setLoading(false)
          addAndRemoveErrorAlert('Could not load usage')(dispatch)
        })
    })
  }, [])

  return (
    <div>
      {loading && <Typography>Loading...</Typography>}
      {!loading && (
        <>
          <Typography variant={'h6'}>Your usage</Typography>
          {usage.map((usage: Usage, index: number) => (
            <div key={usage.date.toDateString()}>
              <Grid container spacing={2} mb={4} mt={4}>
                <Grid item xs={8} md={4} xl={2}>
                  <Grid container direction="column">
                    <Grid item>
                      <Typography variant={'body1'}>
                        {monthNames[usage.date.getUTCMonth()]}{' '}
                        {usage.date.getUTCFullYear()}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant={'body1'}>
                        {usage.tokensUsed.toLocaleString()}
                        {'/'}
                        {monthlyAllowance.toLocaleString()}
                        {' tokens'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={4} md={8} xl={10}>
                  <CircularProgressWithLabel
                    size={80}
                    value={
                      (usage.tokensUsed / monthlyAllowance) * 100 > 100
                        ? 100
                        : (usage.tokensUsed / monthlyAllowance) * 100
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
