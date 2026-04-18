/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as auth from "../auth.js";
import type * as financeiro_analisarFatura from "../financeiro/analisarFatura.js";
import type * as financeiro_cartoes from "../financeiro/cartoes.js";
import type * as financeiro_categorias from "../financeiro/categorias.js";
import type * as financeiro_dashboardFinanceiro from "../financeiro/dashboardFinanceiro.js";
import type * as financeiro_despesas from "../financeiro/despesas.js";
import type * as financeiro_metas from "../financeiro/metas.js";
import type * as financeiro_migrations from "../financeiro/migrations.js";
import type * as financeiro_pagadores from "../financeiro/pagadores.js";
import type * as financeiro_receitas from "../financeiro/receitas.js";
import type * as http from "../http.js";
import type * as pessoas from "../pessoas.js";
import type * as tarefas_agenda from "../tarefas/agenda.js";
import type * as tarefas_conquistas from "../tarefas/conquistas.js";
import type * as tarefas_dashboardTarefas from "../tarefas/dashboardTarefas.js";
import type * as tarefas_gamificacao from "../tarefas/gamificacao.js";
import type * as tarefas_lancamentos from "../tarefas/lancamentos.js";
import type * as tarefas_recorrentes from "../tarefas/recorrentes.js";
import type * as tarefas_tarefasCatalogo from "../tarefas/tarefasCatalogo.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  auth: typeof auth;
  "financeiro/analisarFatura": typeof financeiro_analisarFatura;
  "financeiro/cartoes": typeof financeiro_cartoes;
  "financeiro/categorias": typeof financeiro_categorias;
  "financeiro/dashboardFinanceiro": typeof financeiro_dashboardFinanceiro;
  "financeiro/despesas": typeof financeiro_despesas;
  "financeiro/metas": typeof financeiro_metas;
  "financeiro/migrations": typeof financeiro_migrations;
  "financeiro/pagadores": typeof financeiro_pagadores;
  "financeiro/receitas": typeof financeiro_receitas;
  http: typeof http;
  pessoas: typeof pessoas;
  "tarefas/agenda": typeof tarefas_agenda;
  "tarefas/conquistas": typeof tarefas_conquistas;
  "tarefas/dashboardTarefas": typeof tarefas_dashboardTarefas;
  "tarefas/gamificacao": typeof tarefas_gamificacao;
  "tarefas/lancamentos": typeof tarefas_lancamentos;
  "tarefas/recorrentes": typeof tarefas_recorrentes;
  "tarefas/tarefasCatalogo": typeof tarefas_tarefasCatalogo;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
