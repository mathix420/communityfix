import { describe, it, expect } from 'vitest'
import { LOCATION_SCALES } from '../../server/database/schema'
import { STEPS, render, type StepId } from '../../workers/moderation/src/steps'

const IDS: StepId[] = [
  'issue.moderate',
  'issue.classify-tags',
  'issue.map-sdgs',
  'structure.verdict',
  'case-study.moderate',
  'case-study.curate',
  'issue.curate',
  'location.resolve',
]

describe('moderation step registry', () => {
  it('loads and validates every step file', () => {
    expect(Object.keys(STEPS).sort()).toEqual([...IDS].sort())
    for (const id of IDS) {
      const step = STEPS[id]
      expect(step.id).toBe(id)
      expect(step.model).toBeTruthy()
      expect(step.maxTokens).toBeGreaterThan(0)
      expect(step.version).toBeGreaterThan(0)
      expect(step.system.length).toBeGreaterThan(0)
      expect(step.user.length).toBeGreaterThan(0)
      expect(step.schema.type).toBe('object')
    }
  })

  it('keeps the curate scale enum in sync with LOCATION_SCALES', () => {
    const schema = STEPS['case-study.curate'].schema as {
      properties: { scale: { anyOf: Array<{ enum?: string[] }> } }
    }
    expect(schema.properties.scale.anyOf[0]?.enum).toEqual([...LOCATION_SCALES])
  })
})

describe('render', () => {
  it('substitutes provided variables', () => {
    expect(render('a {{x}} b {{y}}', { x: '1', y: '2' })).toBe('a 1 b 2')
  })

  it('throws on an unknown template variable', () => {
    expect(() => render('hi {{missing}}', {})).toThrow(/missing/)
  })

  it('renders empty-string slots without leftover braces', () => {
    expect(render('{{a}}{{b}}', { a: '', b: 'x' })).toBe('x')
  })
})

// These assertions pin the byte-exact prompts the model receives. They are the
// safety net against silent prompt drift when the YAML is edited: a change to
// wording shows up here (or in the snapshot) and must be reviewed deliberately.
describe('rendered prompts (golden)', () => {
  it('issue.moderate concatenates issueText + duplicateContext verbatim', () => {
    const step = STEPS['issue.moderate']
    expect(render(step.user, { issueText: 'TEXT', duplicateContext: 'DUP' })).toBe('TEXTDUP')
    expect(render(step.system, {})).toMatchSnapshot()
  })

  it('issue.classify-tags appends the tag list under the prompt', () => {
    const step = STEPS['issue.classify-tags']
    const tagList = '- id:1 "water"\n- id:2 "energy"'
    expect(render(step.system, { tagList })).toBe(
      'You classify community issues into relevant tags. Pick 1-3 tags from the provided list that best describe this issue. If no existing tag fits, suggest one new tag name.\n\nAvailable tags:\n- id:1 "water"\n- id:2 "energy"',
    )
    expect(render(step.user, { issueText: 'TEXT' })).toBe('TEXT')
  })

  it('issue.map-sdgs appends the SDG list under the prompt', () => {
    const step = STEPS['issue.map-sdgs']
    expect(render(step.system, { sdgList: '- id:1 "No Poverty"' })).toBe(
      'You map community issues to relevant UN Sustainable Development Goals. Pick 1-3 SDGs that this issue relates to.\n\nAvailable SDGs:\n- id:1 "No Poverty"',
    )
    expect(render(step.user, { issueText: 'TEXT' })).toBe('TEXT')
  })

  it('structure.verdict interpolates the item header and context lines', () => {
    const step = STEPS['structure.verdict']
    expect(render(step.user, { issueId: '42', issueType: 'solution', parentId: 'none', issueText: 'BODY', contextLines: '- #1 x' }))
      .toBe('New item (id: 42, type: solution, parentId: none):\nBODY\n\nExisting similar items:\n- #1 x')
    expect(render(step.system, {})).toMatchSnapshot()
  })

  it('case-study.moderate uses the case study text as the user message', () => {
    const step = STEPS['case-study.moderate']
    expect(render(step.user, { caseStudyText: 'CS' })).toBe('CS')
    expect(render(step.system, {})).toMatchSnapshot()
  })

  it('case-study.curate keeps the parentContext + original JSON layout', () => {
    const step = STEPS['case-study.curate']
    expect(render(step.user, { parentContext: 'PC', originalJson: '{JSON}' }))
      .toBe('PC\n\nCase study (original fields):\n{JSON}')
    // No parent solution → empty parentContext still yields the leading blank lines.
    expect(render(step.user, { parentContext: '', originalJson: '{JSON}' }))
      .toBe('\n\nCase study (original fields):\n{JSON}')
    expect(render(step.system, {})).toMatchSnapshot()
  })

  it('location.resolve lays out the agent inputs and declares the geocode tool', () => {
    const step = STEPS['location.resolve']
    expect(step.tools).toEqual(['geocode'])
    expect(render(step.user, { locationName: 'Brazil (national; Amazon biome)', scale: 'national', latitude: '-15.7939', longitude: '-47.8828', document: 'A reforestation project in the Amazon rainforest.' }))
      .toBe('Stated location name: Brazil (national; Amazon biome)\nScale: national\nCurrent coordinates (latitude, longitude): -15.7939, -47.8828\n\nDocument:\nA reforestation project in the Amazon rainforest.')
    expect(render(step.system, {})).toMatchSnapshot()
  })

  it('issue.curate interpolates the node fields', () => {
    const step = STEPS['issue.curate']
    expect(render(step.user, { kind: 'solution', title: 'Rain gardens', summary: 'Build rain gardens', description: 'Long body.' }))
      .toBe('Type: solution\nTitle: Rain gardens\n\nCurrent summary:\nBuild rain gardens\n\nCurrent description:\nLong body.')
    expect(render(step.system, { kind: 'solution' })).toMatchSnapshot()
  })
})
