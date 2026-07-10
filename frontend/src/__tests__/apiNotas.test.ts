import { vi } from 'vitest'
import { getNotas, getNota, createNota, updateNota, deleteNota, getPastas, getTags, favoritarNota, batchDeleteNotas } from '../api/notas'

vi.mock('../api/client', () => ({
  default: vi.fn(),
}))

import request from '../api/client'

afterEach(() => {
  vi.clearAllMocks()
})

it('getNotas monta query params corretamente', () => {
  getNotas('busca', '2026-06-25', [1, 2], 'criado_em', 10, 20)
  expect(request).toHaveBeenCalledWith('/notas?q=busca&data=2026-06-25&tag_ids=1%2C2&sort=criado_em&limit=10&offset=20')
})

it('getNotas sem parametros nao adiciona query string', () => {
  getNotas()
  expect(request).toHaveBeenCalledWith('/notas')
})

it('getNota chama com id correto', () => {
  getNota(42)
  expect(request).toHaveBeenCalledWith('/notas/42')
})

it('createNota faz POST com body', () => {
  createNota({ titulo: 'Nova nota' })
  expect(request).toHaveBeenCalledWith('/notas', {
    method: 'POST',
    body: JSON.stringify({ titulo: 'Nova nota' }),
  })
})

it('updateNota faz PATCH com body', () => {
  updateNota(1, { titulo: 'Editado' })
  expect(request).toHaveBeenCalledWith('/notas/1', {
    method: 'PATCH',
    body: JSON.stringify({ titulo: 'Editado' }),
  })
})

it('deleteNota faz DELETE', () => {
  deleteNota(1)
  expect(request).toHaveBeenCalledWith('/notas/1', { method: 'DELETE' })
})

it('favoritarNota faz PATCH sem body', () => {
  favoritarNota(5)
  expect(request).toHaveBeenCalledWith('/notas/5/favoritar', { method: 'PATCH' })
})

it('getPastas chama endpoint correto', () => {
  getPastas()
  expect(request).toHaveBeenCalledWith('/notas/pastas')
})

it('getTags chama endpoint correto', () => {
  getTags()
  expect(request).toHaveBeenCalledWith('/notas/tags')
})

it('batchDeleteNotas envia array de ids', () => {
  batchDeleteNotas([1, 2, 3])
  expect(request).toHaveBeenCalledWith('/notas/batch/delete', {
    method: 'POST',
    body: JSON.stringify({ ids: [1, 2, 3] }),
  })
})
