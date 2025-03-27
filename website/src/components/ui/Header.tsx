import * as React from 'react'
import { useContext } from 'react'
import { styled, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import CssBaseline from '@mui/material/CssBaseline'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { Alert, Button, Snackbar } from '@mui/material'
import { signOut } from 'aws-amplify/auth'
import AssistantIcon from '@mui/icons-material/Assistant'
import SettingsIcon from '@mui/icons-material/Settings'
import HomeIcon from '@mui/icons-material/Home'
import DataUsageIcon from '@mui/icons-material/DataUsage'
import { useNavigate } from 'react-router-dom'
import { PrivateConfigContext } from '../../store/PrivateConfigContextProvider'
import { useSelector } from 'react-redux'
import { Build } from '@mui/icons-material'

const drawerWidth = 240

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}))

interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}))

export function Header({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  const theme = useTheme()
  const [open, setOpen] = React.useState(true)

  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }
  const configContext = useContext(PrivateConfigContext)

  const alerts = useSelector((state: any) => state.alerts)

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            onClick={() => navigate('/home')}
            sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}
          >
            <HomeIcon sx={{ cursor: 'pointer' }} />
            <Typography
              sx={{ cursor: 'pointer', ml: 1 }}
              variant="h6"
              noWrap
              component="div"
            >
              OpenRAGAI
            </Typography>
          </Box>
          <Button color="inherit" onClick={() => signOut()}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      {alerts.successAlerts.map((alert: string, index: number) => (
        <Snackbar open={true} key={`sucess-${index}`}>
          <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
            {alert}
          </Alert>
        </Snackbar>
      ))}
      {alerts.errorAlerts.map((alert: string, index: number) => (
        <Snackbar open={true} key={`error-${index}`}>
          <Alert severity="error" variant="filled" sx={{ width: '100%' }}>
            {alert}
          </Alert>
        </Snackbar>
      ))}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'ltr' ? (
              <ChevronLeftIcon />
            ) : (
              <ChevronRightIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {configContext.chatBotsConfig.chatbots &&
            configContext.chatBotsConfig.chatbots.map((chatbot, index) => (
              <ListItem key={chatbot.name} disablePadding>
                <ListItemButton
                  onClick={() => navigate(`/chatbot/${chatbot.id}`)}
                >
                  <ListItemIcon>
                    <AssistantIcon />
                  </ListItemIcon>
                  <ListItemText primary={chatbot.name} />
                </ListItemButton>
                {configContext.isAdministrator && (
                  <ListItemButton
                    onClick={() => navigate(`/chatbot/${chatbot.id}/settings`)}
                  >
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                  </ListItemButton>
                )}
              </ListItem>
            ))}
        </List>
        <Divider />
        <List>
          <ListItem
            key={'Settings'}
            disablePadding
            onClick={() => navigate('/settings')}
          >
            <ListItemButton>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary={'Settings'} />
            </ListItemButton>
          </ListItem>
          {configContext.isAdministrator && (
            <ListItem
              key={'Tools'}
              disablePadding
              onClick={() => navigate('/tools')}
            >
              <ListItemButton>
                <ListItemIcon>
                  <Build />
                </ListItemIcon>
                <ListItemText primary={'Tools'} />
              </ListItemButton>
            </ListItem>
          )}
          {configContext.isAdministrator && (
            <ListItem
              key={'Usage'}
              disablePadding
              onClick={() => navigate('/usage')}
            >
              <ListItemButton>
                <ListItemIcon>
                  <DataUsageIcon />
                </ListItemIcon>
                <ListItemText primary={'Usage'} />
              </ListItemButton>
            </ListItem>
          )}
        </List>
        <Divider />
        {/*<List>*/}
        {/*  <ListItem key={'Help'} disablePadding>*/}
        {/*    <ListItemButton>*/}
        {/*      <ListItemIcon>*/}
        {/*        <HelpIcon />*/}
        {/*      </ListItemIcon>*/}
        {/*      <ListItemText primary={'Help'} />*/}
        {/*    </ListItemButton>*/}
        {/*  </ListItem>*/}
        {/*</List>*/}
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  )
}
