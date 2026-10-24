export const EXAMPLES: { title: string; code: string; note?: string }[] = [
  {
    title: 'Settings example',
    code: ['title My diagram', 'direction down', 'colorMode bold', 'styleMode shadow', 'typeface mono', 'A > B'].join('\n'),
    note: 'Setting lines can go anywhere. A diagram without them uses the defaults.',
  },
  {
    title: 'Nodes and attributes',
    code: ['Start [shape: oval, color: green]', 'Database [icon: aws-rds, shape: cylinder]', 'Plain node'].join('\n'),
    note: 'A line with just a name makes a node. Put attributes in [ ] separated by commas: icon, color, shape, label.',
  },
  {
    title: 'Cloud icons',
    code: ['VPC [icon: aws-vpc] {', 'Web [icon: aws-ec2]', 'Store [icon: aws-s3]', '}', 'Web > Store'].join('\n'),
    note: 'Type icon: and part of a name (for example "bucket") for suggestions, or put the cursor on a node line and use the Icon button. AWS, Azure, Google Cloud and Kubernetes icons are included. An unknown name shows a generic icon and an error on that line.',
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
  {
    title: 'Sequence: messages',
    code: ['Browser > Server: log in', 'Server --> Browser: token', 'Server > Server: check password', 'Cache [label: "Session cache", color: teal]'].join('\n'),
    note: 'Pick Sequence in the Type menu. > is a solid arrow, --> a dashed reply, and a name on both sides makes a message to itself. Names are created the first time they appear; add a line with just a name to place it earlier.',
  },
  {
    title: 'Sequence: activation',
    code: ['Browser > Server: place order', 'activate Server', 'Server > Browser: done', 'deactivate Server'].join('\n'),
    note: 'activate and deactivate draw a bar along that participant. A bar that is never closed runs to the end.',
  },
  {
    title: 'Sequence: blocks',
    code: ['loop [every minute] {', 'Worker > Queue: poll', '}', 'alt [found] {', 'Queue --> Worker: job', '} else [empty] {', 'Queue --> Worker: nothing', '}', 'opt [slow] {', 'Worker > Log: warn', '}', 'par [both] {', 'Worker > A: ping', '} and {', 'Worker > B: ping', '}'].join('\n'),
    note: 'loop, alt, opt and par open with { at the end of the line and close with } on its own line. alt continues with } else [label] { and par with } and [label] {. Blocks can nest.',
  },
]
