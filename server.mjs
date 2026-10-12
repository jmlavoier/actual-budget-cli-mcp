import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const field = (flag, type = 'text', required = false) => ({ flag, type, required });
const operation = (command, positionals = [], options = {}, extra = {}) => ({
  command,
  positionals,
  options,
  ...extra,
});

export const READ_OPERATIONS = {
  'accounts.list': operation(['accounts', 'list'], [], { includeClosed: field('--include-closed', 'switch') }),
  'accounts.balance': operation(['accounts', 'balance'], ['id'], { cutoff: field('--cutoff', 'date') }),
  'budgets.list': operation(['budgets', 'list']),
  'budgets.months': operation(['budgets', 'months']),
  'budgets.month': operation(['budgets', 'month'], ['month']),
  'categories.list': operation(['categories', 'list'], [], { includeHidden: field('--include-hidden', 'switch') }),
  'categoryGroups.list': operation(['category-groups', 'list'], [], { includeHidden: field('--include-hidden', 'switch') }),
  'transactions.list': operation(['transactions', 'list'], [], {
    account: field('--account', 'text', true),
    start: field('--start', 'date', true),
    end: field('--end', 'date', true),
  }),
  'payees.list': operation(['payees', 'list']),
  'payees.common': operation(['payees', 'common']),
  'tags.list': operation(['tags', 'list']),
  'rules.list': operation(['rules', 'list']),
  'rules.payeeRules': operation(['rules', 'payee-rules'], ['payeeId']),
  'schedules.list': operation(['schedules', 'list']),
  'query.run': operation(['query', 'run'], [], {
    table: field('--table'),
    select: field('--select', 'csv'),
    filter: field('--filter', 'json'),
    where: field('--where', 'json'),
    orderBy: field('--order-by', 'csv'),
    limit: field('--limit', 'nonnegativeInteger'),
    offset: field('--offset', 'nonnegativeInteger'),
    last: field('--last', 'nonnegativeInteger'),
    count: field('--count', 'switch'),
    groupBy: field('--group-by', 'csv'),
    query: field(null, 'json'),
  }),
  'query.tables': operation(['query', 'tables']),
  'query.fields': operation(['query', 'fields'], ['table']),
  'server.version': operation(['server', 'version']),
  'server.getId': operation(['server', 'get-id'], [], {
    type: field('--type', 'entityType', true),
    name: field('--name', 'text', true),
  }),
  'sync.status': operation(['sync', '--status']),
};

export const WRITE_OPERATIONS = {
  'accounts.create': operation(['accounts', 'create'], [], {
    name: field('--name', 'text', true), offbudget: field('--offbudget', 'switch'),
    balance: field('--balance', 'integer'),
  }),
  'accounts.update': operation(['accounts', 'update'], ['id'], {
    name: field('--name'), offbudget: field('--offbudget', 'boolean'),
  }),
  'accounts.close': operation(['accounts', 'close'], ['id'], {
    transferAccount: field('--transfer-account'), transferCategory: field('--transfer-category'),
  }),
  'accounts.reopen': operation(['accounts', 'reopen'], ['id']),
  'accounts.delete': operation(['accounts', 'delete'], ['id']),
  'budgets.download': operation(['budgets', 'download'], ['syncId']),
  'budgets.sync': operation(['budgets', 'sync']),
  'budgets.setAmount': operation(['budgets', 'set-amount'], [], {
    month: field('--month', 'month', true), category: field('--category', 'text', true),
    amount: field('--amount', 'integer', true),
  }),
  'budgets.setCarryover': operation(['budgets', 'set-carryover'], [], {
    month: field('--month', 'month', true), category: field('--category', 'text', true),
    flag: field('--flag', 'boolean', true),
  }),
  'budgets.holdNextMonth': operation(['budgets', 'hold-next-month'], [], {
    month: field('--month', 'month', true), amount: field('--amount', 'integer', true),
  }),
  'budgets.resetHold': operation(['budgets', 'reset-hold'], [], { month: field('--month', 'month', true) }),
  'categories.create': operation(['categories', 'create'], [], {
    name: field('--name', 'text', true), groupId: field('--group-id', 'text', true),
    isIncome: field('--is-income', 'switch'),
  }),
  'categories.update': operation(['categories', 'update'], ['id'], {
    name: field('--name'), hidden: field('--hidden', 'boolean'),
  }),
  'categories.delete': operation(['categories', 'delete'], ['id'], { transferTo: field('--transfer-to') }),
  'categoryGroups.create': operation(['category-groups', 'create'], [], {
    name: field('--name', 'text', true), isIncome: field('--is-income', 'switch'),
  }),
  'categoryGroups.update': operation(['category-groups', 'update'], ['id'], {
    name: field('--name'), hidden: field('--hidden', 'boolean'),
  }),
  'categoryGroups.delete': operation(['category-groups', 'delete'], ['id'], { transferTo: field('--transfer-to') }),
  'transactions.add': operation(['transactions', 'add'], [], {
    account: field('--account', 'text', true), data: field('--data', 'array', true),
    learnCategories: field('--learn-categories', 'switch'), runTransfers: field('--run-transfers', 'switch'),
  }),
  'transactions.import': operation(['transactions', 'import'], [], {
    account: field('--account', 'text', true), data: field('--data', 'array', true),
    dryRun: field('--dry-run', 'switch'),
  }),
  'transactions.update': operation(['transactions', 'update'], ['id'], { data: field('--data', 'object', true) }),
  'transactions.delete': operation(['transactions', 'delete'], ['id']),
  'payees.create': operation(['payees', 'create'], [], { name: field('--name', 'text', true) }),
  'payees.update': operation(['payees', 'update'], ['id'], { name: field('--name', 'text', true) }),
  'payees.delete': operation(['payees', 'delete'], ['id']),
  'payees.merge': operation(['payees', 'merge'], [], {
    target: field('--target', 'text', true), ids: field('--ids', 'csv', true),
  }),
  'tags.create': operation(['tags', 'create'], [], {
    tag: field('--tag', 'text', true), color: field('--color'), description: field('--description'),
  }),
  'tags.update': operation(['tags', 'update'], ['id'], {
    tag: field('--tag'), color: field('--color'), description: field('--description'),
  }),
  'tags.delete': operation(['tags', 'delete'], ['id']),
  'rules.create': operation(['rules', 'create'], [], { data: field('--data', 'object', true) }),
  'rules.update': operation(['rules', 'update'], [], { data: field('--data', 'object', true) }),
  'rules.delete': operation(['rules', 'delete'], ['id']),
  'schedules.create': operation(['schedules', 'create'], [], { data: field('--data', 'object', true) }),
  'schedules.update': operation(['schedules', 'update'], ['id'], {
    data: field('--data', 'object', true), resetNextDate: field('--reset-next-date', 'switch'),
  }),
  'schedules.delete': operation(['schedules', 'delete'], ['id']),
  'server.bankSync': operation(['server', 'bank-sync'], [], { account: field('--account') }),
  'sync.run': operation(['sync']),
};

const TOOLS = [
  {
    name: 'actual_operations',
    description: 'List supported Actual CLI operations and their parameter names. Amounts are integer cents.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'actual_read',
    description: 'Read Actual Budget data through the installed actual CLI. Call actual_operations for parameter names. JSON amounts are integer cents.',
    inputSchema: {
      type: 'object', required: ['operation'], additionalProperties: false,
      properties: {
        operation: { type: 'string', enum: Object.keys(READ_OPERATIONS) },
        params: { type: 'object', additionalProperties: true },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'actual_write',
    description: 'Modify Actual Budget data through the installed actual CLI. Call actual_operations for parameter names. Amounts must be integer cents. This tool can change or delete financial data.',
    inputSchema: {
      type: 'object', required: ['operation'], additionalProperties: false,
      properties: {
        operation: { type: 'string', enum: Object.keys(WRITE_OPERATIONS) },
        params: { type: 'object', additionalProperties: true },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
];

function normalizeValue(name, value, type) {
  if (type === 'switch' || type === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`);
    return type === 'switch' ? value : String(value);
  }
  if (type === 'integer' || type === 'nonnegativeInteger') {
    if (!Number.isSafeInteger(value) || (type === 'nonnegativeInteger' && value < 0)) {
      throw new Error(`${name} must be ${type === 'integer' ? 'an integer' : 'a nonnegative integer'}`);
    }
    return String(value);
  }
  if (type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
    return JSON.stringify(value);
  }
  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
    return JSON.stringify(value);
  }
  if (type === 'json') {
    if (value === null || typeof value !== 'object') throw new Error(`${name} must be a JSON object or array`);
    return JSON.stringify(value);
  }
  if (type === 'csv' && Array.isArray(value)) {
    if (value.length === 0 || !value.every(item => typeof item === 'string' && item.length > 0)) {
      throw new Error(`${name} must contain nonempty strings`);
    }
    return value.join(',');
  }
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    throw new Error(`${name} must be a nonempty string`);
  }
  if (type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must be YYYY-MM-DD`);
  if (type === 'month' && !/^\d{4}-\d{2}$/.test(value)) throw new Error(`${name} must be YYYY-MM`);
  if (type === 'entityType' && !['accounts', 'categories', 'payees', 'schedules'].includes(value)) {
    throw new Error(`${name} has an unsupported entity type`);
  }
  if (type === 'csv' && value.length === 0) throw new Error(`${name} must not be empty`);
  return value;
}

function validateCentAmounts(value) {
  if (Array.isArray(value)) {
    value.forEach(validateCentAmounts);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'amount' && typeof item === 'number' && !Number.isSafeInteger(item)) {
        throw new Error('amount must be integer cents');
      }
      validateCentAmounts(item);
    }
  }
}

export function buildCommand(kind, name, params = {}) {
  const operations = kind === 'read' ? READ_OPERATIONS : kind === 'write' ? WRITE_OPERATIONS : null;
  if (!operations || !Object.hasOwn(operations, name)) throw new Error('Unsupported operation');
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('params must be an object');
  const spec = operations[name];
  const allowed = new Set([...spec.positionals, ...Object.keys(spec.options)]);
  for (const key of Object.keys(params)) {
    if (!allowed.has(key)) throw new Error(`Unknown parameter: ${key}`);
  }
  if (kind === 'write' && ['transactions.add', 'transactions.import', 'transactions.update', 'schedules.create', 'schedules.update'].includes(name)) {
    validateCentAmounts(params.data);
  }
  const args = ['--format=json', ...spec.command];
  for (const key of spec.positionals) {
    const value = normalizeValue(key, params[key], key === 'month' ? 'month' : 'text');
    if (value.startsWith('-')) throw new Error(`${key} must not start with a dash`);
    args.push(value);
  }
  let stdin;
  for (const [key, optionSpec] of Object.entries(spec.options)) {
    if (!Object.hasOwn(params, key)) {
      if (optionSpec.required) throw new Error(`Missing parameter: ${key}`);
      continue;
    }
    const value = normalizeValue(key, params[key], optionSpec.type);
    if (key === 'query') {
      stdin = value;
      args.push('--file=-');
    } else if (optionSpec.type === 'switch') {
      if (value) args.push(optionSpec.flag);
    } else {
      args.push(`${optionSpec.flag}=${value}`);
    }
  }
  if (name === 'query.run' && params.query && Object.keys(params).length !== 1) {
    throw new Error('query cannot be combined with other query options');
  }
  if (name === 'query.run' && params.filter && params.where) {
    throw new Error('Use either filter or where');
  }
  return { args, stdin };
}

function redactSecrets(message) {
  let result = message;
  for (const key of ['ACTUAL_PASSWORD', 'ACTUAL_SESSION_TOKEN', 'ACTUAL_ENCRYPTION_PASSWORD']) {
    const secret = process.env[key];
    if (secret) result = result.replaceAll(secret, '[redacted]');
  }
  return result;
}

function runCli(args, stdin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ACTUAL_CLI_BIN || 'actual', args, {
      env: process.env, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, 90_000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout.length > 250_000) child.kill('SIGTERM');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
      if (stderr.length > 20_000) child.kill('SIGTERM');
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(new Error(`Could not start actual CLI: ${error.message}`));
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error('Actual CLI timed out after 90 seconds'));
      if (stdout.length > 250_000) return reject(new Error('Actual CLI result is too large; narrow the query'));
      if (code !== 0) return reject(new Error(redactSecrets(stderr.trim() || `Actual CLI exited with code ${code}`)));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Actual CLI returned invalid JSON'));
      }
    });
    child.stdin.end(stdin ?? '');
  });
}

function toolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

async function callTool(name, args) {
  if (name === 'actual_operations') {
    const describe = operations => Object.fromEntries(Object.entries(operations).map(([key, spec]) => [key, {
      required: [...spec.positionals, ...Object.entries(spec.options).filter(([, value]) => value.required).map(([fieldName]) => fieldName)],
      optional: Object.entries(spec.options).filter(([, value]) => !value.required).map(([fieldName]) => fieldName),
      types: Object.fromEntries([
        ...spec.positionals.map(fieldName => [fieldName, fieldName === 'month' ? 'month' : 'text']),
        ...Object.entries(spec.options).map(([fieldName, value]) => [fieldName, value.type]),
      ]),
    }]));
    return toolResult({ read: describe(READ_OPERATIONS), write: describe(WRITE_OPERATIONS), amounts: 'integer cents' });
  }
  if (name !== 'actual_read' && name !== 'actual_write') throw new Error(`Unknown tool: ${name}`);
  const kind = name === 'actual_read' ? 'read' : 'write';
  if (!args || typeof args !== 'object' || Array.isArray(args) || typeof args.operation !== 'string') {
    throw new Error('operation is required');
  }
  if (Object.keys(args).some(key => !['operation', 'params'].includes(key))) throw new Error('Unknown tool argument');
  const { args: cliArgs, stdin } = buildCommand(kind, args.operation, args.params);
  const data = await runCli(cliArgs, stdin);
  return toolResult({ operation: args.operation, data });
}

function response(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

async function serve() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    let message;
    try {
      message = JSON.parse(line);
      if (!Object.hasOwn(message, 'id')) continue;
      if (message.method === 'initialize') {
        response(message.id, {
          protocolVersion: message.params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'actual-budget-cli-mcp', version: '0.1.0' },
        });
      } else if (message.method === 'ping') {
        response(message.id, {});
      } else if (message.method === 'tools/list') {
        response(message.id, { tools: TOOLS });
      } else if (message.method === 'tools/call') {
        try {
          response(message.id, await callTool(message.params?.name, message.params?.arguments ?? {}));
        } catch (error) {
          response(message.id, {
            isError: true,
            content: [{ type: 'text', text: redactSecrets(error instanceof Error ? error.message : String(error)) }],
          });
        }
      } else if (message.method === 'resources/list' || message.method === 'prompts/list') {
        response(message.id, { [message.method.startsWith('resources') ? 'resources' : 'prompts']: [] });
      } else {
        process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } })}\n`);
      }
    } catch (error) {
      if (message && Object.hasOwn(message, 'id')) {
        process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: 'Internal error' } })}\n`);
      }
      process.stderr.write(`${redactSecrets(error instanceof Error ? error.message : String(error))}\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await serve();
}
