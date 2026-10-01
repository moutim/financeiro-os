'use client';

import { withModeVariants } from '@/components/mode/ModeSwitch';
import TransactionFormSimple from './TransactionFormSimple';
import TransactionFormDetailed from './TransactionFormDetailed';

/** Formulário de nova transação: versão minimalista ou com Macro › Micro, conforme o modo */
const TransactionForm = withModeVariants(TransactionFormSimple, TransactionFormDetailed);

export default TransactionForm;
