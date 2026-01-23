import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CharacterCreation from './pages/character-creator'
import Preview from './pages/preview'

function App() {

  return (
    <div className="dark:bg-neutral-950 w-full h-full min-w-screen min-h-screen">
    <BrowserRouter>
      <Routes>
        <Route path="/create" element={<CharacterCreation/>} />
        <Route path="/preview" element={<Preview/>} />
      </Routes>
    </BrowserRouter>
    </div>
  )
}

export default App
