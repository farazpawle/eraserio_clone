export const EXAMPLES: { title: string; code: string; note?: string }[] = [
  {
    title: 'Settings',
    code: ['title My diagram', 'direction down', 'colorMode bold', 'styleMode shadow', 'typeface mono', 'A > B'].join('\n'),
    note: 'Setting lines can go anywhere. A diagram without them uses the defaults.',
  },
  {
    title: 'Nodes and attributes',
    code: ['Start [shape: oval, color: green]', 'Database [icon: aws-rds, shape: cylinder]', 'Plain node'].join('\n'),
    note: 'A line with just a name makes a node. Put attributes in [ ] separated by commas: icon, color, shape, label.',
  },
  {
    title: 'Display label',
    code: ['db [label: "User database", shape: cylinder]', 'api > db'].join('\n'),
    note: 'The name is what edges refer to; the label is what the box shows.',
  },
  {
    title: 'Groups',
    code: ['Backend [color: purple] {', 'API', 'Worker', 'Inner team {', 'Queue', '}', '}', 'API > Worker'].join('\n'),
    note: 'A group opens with { at the end of its line and closes with } on its own line. Groups can nest.',
  },
  {
    title: 'The five edge kinds',
    code: ['A > B', 'B < C', 'C <> D', 'D - E', 'E --> F'].join('\n'),
    note: '> arrow, < arrow the other way, <> arrow both ways, - plain line (needs spaces around it), --> dashed arrow.',
  },
  {
    title: 'Edge labels',
    code: ['Order > Payment: pay', 'Payment > Shipped: "ok: paid"'].join('\n'),
    note: 'Text after a colon labels the edge.',
  },
  {
    title: 'Chains',
    code: 'Cart > Shipping > Payment > Done',
    note: 'One line can link many nodes in a row.',
  },
  {
    title: 'Fan-out',
    code: ['Gateway > Users, Orders, Billing', 'Users, Orders > Database'].join('\n'),
    note: 'Separate names with commas to draw one edge from or to each.',
  },
  {
    title: 'Comments',
    code: ['// This line is ignored', 'A > B // so is this part'].join('\n'),
    note: 'Everything after // on a line is ignored.',
  },
]
