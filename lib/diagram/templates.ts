import type { DiagramType } from './types'

// Code a new diagram starts with.
export const STARTERS: Record<DiagramType, string> = {
  flowchart: [
    'title Checkout',
    'Cart [shape: oval]',
    'Shipping details',
    'Payment [shape: diamond, color: blue]',
    'Order confirmed [color: green]',
    'Payment failed [color: red]',
    'Cart > Shipping details > Payment',
    'Payment > Order confirmed: approved',
    'Payment > Payment failed: declined',
    'Payment failed > Payment: retry',
  ].join('\n'),
  cloud: [
    'title Web app',
    'VPC [icon: aws-vpc] {',
    'Load balancer [icon: aws-elb]',
    'Web service [icon: aws-ec2]',
    'Worker service [icon: aws-ec2]',
    'Database [icon: aws-rds, shape: cylinder]',
    '}',
    'Load balancer > Web service, Worker service',
    'Web service, Worker service > Database',
  ].join('\n'),
}
