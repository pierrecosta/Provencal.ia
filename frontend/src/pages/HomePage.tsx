import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSayings } from '../hooks/useSayings'
import SayingOfTheDay from '../components/sayings/SayingOfTheDay'
import SayingsList from '../components/sayings/SayingsList'
import './HomePage.css'

export default function HomePage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { isAuthenticated } = useAuth()
  const {
    todaySaying, todayLoading, todayError,
    sayings, hasMore, listLoading, sentinelRef,
    filterType, filterLocalite,
    setFilterType, setFilterLocalite,
    createSaying, updateSaying, deleteSaying,
    addSaying, replaceSaying, removeSaying,
  } = useSayings()

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="home-page">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Accueil — Mémoire vivante
      </h1>

      <SayingOfTheDay saying={todaySaying} loading={todayLoading} error={todayError} />

      <SayingsList
        sayings={sayings}
        hasMore={hasMore}
        listLoading={listLoading}
        sentinelRef={sentinelRef}
        filterType={filterType}
        filterLocalite={filterLocalite}
        isAuthenticated={isAuthenticated}
        onSetFilterType={setFilterType}
        onSetFilterLocalite={setFilterLocalite}
        onCreateSaying={createSaying}
        onUpdateSaying={updateSaying}
        onDeleteSaying={deleteSaying}
        onAdd={addSaying}
        onReplace={replaceSaying}
        onRemove={removeSaying}
      />
    </div>
  )
}

