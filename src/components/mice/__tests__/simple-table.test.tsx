import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SimpleTable } from '../shared'

afterEach(cleanup)

interface Row {
  id: string
  name: string
}

describe('SimpleTable', () => {
  it('renders a captioned table with the supplied cells', () => {
    render(
      <SimpleTable<Row>
        caption="Events matching the filter"
        rows={[{ id: 'a', name: 'Coast Heritage' }]}
        columns={[
          { header: 'Name', cell: (row) => row.name },
          { header: 'Id', cell: (row) => row.id },
        ]}
      />,
    )
    expect(screen.getByText('Events matching the filter')).toBeTruthy()
    expect(screen.getByText('Coast Heritage')).toBeTruthy()
    expect(screen.getByText('a')).toBeTruthy()
  })

  it('shows the empty state instead of an empty table', () => {
    render(
      <SimpleTable<Row>
        caption="Events"
        rows={[]}
        emptyTitle="No events match"
        emptyDescription="Clear the search."
        columns={[{ header: 'Name', cell: (row) => row.name }]}
      />,
    )
    expect(screen.getByText('No events match')).toBeTruthy()
    expect(screen.queryByText('Clear the search.')).toBeTruthy()
  })
})
