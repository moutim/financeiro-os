'use client';

import { withModeVariants } from '@/components/mode/ModeSwitch';
import TransactionEditModalSimple from './TransactionEditModalSimple';
import TransactionEditModalDetailed from './TransactionEditModalDetailed';

/** Edição de transação: categoria única (simples) ou Macro › Micro + data (detalhado) */
const TransactionEditModal = withModeVariants(TransactionEditModalSimple, TransactionEditModalDetailed);

export default TransactionEditModal;
