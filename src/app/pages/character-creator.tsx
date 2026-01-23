import CharacterCreator from '../ui/CharacterCreation'
import Navbar from '../ui/Navbar'

const CharacterCreation = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 w-full">
        <CharacterCreator />
      </div>
    </div>
  )
}

export default CharacterCreation
