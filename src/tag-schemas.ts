/**
 * Tag schemas owned by semiont-gutenberg-kb.
 *
 * Schemas are runtime-registered per KB via `frame.addTagSchema(...)`.
 * The `register-tag-schemas` skill registers all of them at once for KB
 * bootstrap. Skills that use a specific schema can also self-register
 * idempotently at startup.
 */

import type { TagSchema } from '@semiont/sdk';

export const ARGUMENT_TOULMIN_SCHEMA: TagSchema = {
  id: 'argument-toulmin',
  name: 'Argument Structure (Toulmin)',
  description: 'Claim, Evidence, Warrant, Counterargument, Rebuttal framework for argumentation',
  domain: 'general',
  tags: [
    {
      name: 'Claim',
      description: 'The main assertion or thesis',
      examples: [
        'What is being argued?',
        'What is the main point?',
        'What position is being taken?',
      ],
    },
    {
      name: 'Evidence',
      description: 'Data or facts supporting the claim',
      examples: [
        'What supports this claim?',
        'What are the facts?',
        'What data is provided?',
      ],
    },
    {
      name: 'Warrant',
      description: 'Reasoning connecting evidence to claim',
      examples: [
        'Why does this evidence support the claim?',
        'What is the logic?',
        'How does this reasoning work?',
      ],
    },
    {
      name: 'Counterargument',
      description: 'Opposing viewpoints or objections',
      examples: [
        'What are the objections?',
        'What do critics say?',
        'What are alternative views?',
      ],
    },
    {
      name: 'Rebuttal',
      description: 'Response to counterarguments',
      examples: [
        'How is the objection addressed?',
        'Why is the counterargument wrong?',
        'How is the criticism answered?',
      ],
    },
  ],
};

export const ALL_SCHEMAS: TagSchema[] = [ARGUMENT_TOULMIN_SCHEMA];
