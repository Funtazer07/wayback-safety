import { createRoot } from 'react-dom/client'
import '../../../index.css'
import '../walk.css'
import ReminderPreview from './ReminderPreview.tsx'
import './reminderPreview.css'

createRoot(document.getElementById('root')!).render(<ReminderPreview />)
