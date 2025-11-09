# Documentação das Regras de Negócio - Sistema de Agendamento

## Resumo da Implementação

Este documento descreve as regras de negócio implementadas no sistema de agendamento com foco em **múltiplos endereços por profissional**.

---

## 1. Regras de Endereços

### 1.1 Múltiplos Endereços por Profissional
✅ **IMPLEMENTADO**
- Cada profissional pode cadastrar **múltiplos endereços**
- Cada endereço possui: nome, rua, número, complemento, bairro, cidade, estado e CEP
- Endereços são vinculados ao profissional através do campo `user`
- Apenas o profissional proprietário pode criar, editar ou excluir seus endereços

**Schemas:**
- `src/address/address.schema.ts` - Define o modelo de endereço com referência ao usuário

**Endpoints:**
```
POST   /addresses           - Criar endereço (autenticado)
GET    /addresses           - Listar endereços do profissional (autenticado)
GET    /addresses/user/:id  - Listar endereços públicos de um profissional
PUT    /addresses/:id       - Atualizar endereço (autenticado)
DELETE /addresses/:id       - Deletar endereço (autenticado)
```

---

## 2. Regras de Agenda

### 2.1 Vínculo de Endereço Obrigatório
✅ **IMPLEMENTADO**
- Cada agenda (schedule) **DEVE** ter um endereço vinculado
- Ao criar uma agenda, o profissional seleciona em qual endereço ela será realizada
- O sistema valida se o endereço pertence ao profissional antes de criar a agenda

**Schema:**
- `src/schedule/schedule.schema.ts` - Campo `address` é obrigatório e referencia Address

**Validação:**
```typescript
// No ScheduleService.create()
try {
  await this.addressService.findOne(createScheduleDto.address, userId);
} catch (error) {
  throw new BadRequestException('Address not found or does not belong to you');
}
```

### 2.2 Múltiplas Agendas por Data
✅ **IMPLEMENTADO**
- Um profissional pode ter agendas em **diferentes endereços** no mesmo dia
- Exemplo: 
  - 08:00-12:00 na Clínica Centro
  - 14:00-18:00 no Consultório Jardins

**DTO:**
- `src/schedule/dto/create-schedule.dto.ts` - Campo `address` obrigatório

---

## 3. Regras de Visualização Pública

### 3.1 Seleção de Endereço Obrigatória (se múltiplos)
✅ **IMPLEMENTADO**
- Na página pública de agendamento, se o profissional tiver **mais de um endereço**:
  1. Cliente primeiro vê a lista de endereços disponíveis
  2. Cliente seleciona o endereço desejado
  3. Sistema exibe apenas horários do endereço selecionado

**Endpoints Públicos:**
```
GET /schedules/public/addresses/:userId  - Lista endereços do profissional
GET /schedules/public?userId=X&month=Y&addressId=Z - Lista horários filtrados
```

### 3.2 Retorno de Informações do Endereço
✅ **IMPLEMENTADO**
- Ao buscar horários disponíveis, o sistema retorna também os dados do endereço
- Utiliza MongoDB aggregation com `$lookup` para fazer join com a collection de addresses
- Cliente vê: nome do local, rua, número, bairro, cidade, estado

**Resposta de Exemplo:**
```json
{
  "_id": "507f191e810c19729de860ea",
  "date": "2025-11-15",
  "time": "08:00",
  "status": "open",
  "address": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Clínica Centro",
    "street": "Rua das Flores",
    "number": "123",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

---

## 4. Fluxo de Uso Completo

### 4.1 Fluxo do Profissional

```
1. Login no sistema
   POST /auth/login

2. Cadastrar Endereços
   POST /addresses (Clínica Centro)
   POST /addresses (Consultório Jardins)
   POST /addresses (Atendimento Domiciliar)

3. Criar Agendas por Endereço
   POST /schedules 
   {
     "date": "2025-11-15",
     "address": "id_clinica_centro",
     "timeSlots": ["08:00", "08:30", "09:00"]
   }

   POST /schedules
   {
     "date": "2025-11-15", 
     "address": "id_consultorio_jardins",
     "timeSlots": ["14:00", "14:30", "15:00"]
   }

4. Visualizar Agendamentos
   GET /appointments
   - Vê todos os agendamentos com informações de endereço

5. Gerenciar Status
   PATCH /appointments/:id/status
   - Confirmar, cancelar ou marcar como realizado
```

### 4.2 Fluxo do Cliente (Página Pública)

```
1. Acessar página do profissional
   GET /schedules/public/addresses/:professionalId
   
   Resposta: Lista de endereços disponíveis
   [
     { _id: "1", name: "Clínica Centro", city: "São Paulo" },
     { _id: "2", name: "Consultório Jardins", city: "São Paulo" }
   ]

2. Selecionar Endereço
   (Interface exibe botões/dropdown com os endereços)

3. Ver Horários Disponíveis
   GET /schedules/public?userId=X&month=11&addressId=1
   
   Resposta: Apenas horários da Clínica Centro

4. Fazer Agendamento
   POST /appointments
   {
     "scheduleId": "id_do_horario_selecionado",
     "patientName": "Maria Santos",
     "patientPhone": "11988888888"
   }

5. Confirmação
   - Sistema retorna dados do agendamento com endereço
   - Cliente recebe confirmação por WhatsApp (se configurado)
```

---

## 5. Validações Implementadas

### 5.1 Criação de Agenda
✅ Verifica se o `addressId` é válido (ObjectId)
✅ Verifica se o endereço existe
✅ Verifica se o endereço pertence ao profissional autenticado
✅ Valida formato de data e horários

### 5.2 Busca Pública de Horários
✅ Valida `userId` do profissional
✅ Valida `addressId` se fornecido
✅ Valida intervalo de mês (1-12)
✅ Retorna apenas horários com `status: 'open'`

### 5.3 Gerenciamento de Endereços
✅ Apenas proprietário pode editar/deletar
✅ Validação de campos obrigatórios
✅ Formatação de CEP

---

## 6. Estrutura de Dados

### 6.1 Address (Endereço)
```typescript
{
  _id: ObjectId,
  user: ObjectId,              // Referência ao profissional
  name: string,                // Ex: "Clínica Centro"
  street: string,
  number: string,
  complement?: string,
  neighborhood: string,
  city: string,
  state: string,
  zipCode: string,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 Schedule (Agenda)
```typescript
{
  _id: ObjectId,
  user: ObjectId,              // Referência ao profissional
  address: ObjectId,           // Referência ao endereço (OBRIGATÓRIO)
  dateTime: Date,
  status: 'open' | 'closed',
  appointment: ObjectId | null,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.3 Appointment (Agendamento)
```typescript
{
  _id: ObjectId,
  schedule: ObjectId,          // Referência à agenda
  professional: ObjectId,      // Referência ao profissional
  patientName: string,
  patientPhone: string,
  patientEmail?: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7. Integrações

### 7.1 MongoDB Aggregation
- Utiliza `$lookup` para popular endereços nas consultas
- Otimiza queries com `$match` e `$project`
- Formata datas com timezone -03:00 (Brasília)

### 7.2 WhatsApp (Opcional)
- Envia lembretes de agendamento
- Confirmações automáticas
- Inclui endereço nas mensagens

### 7.3 Bull Queue
- Processa filas de envio de mensagens
- Agendamento de lembretes
- Dashboard de monitoramento em `/admin/queues`

---

## 8. Próximas Melhorias Sugeridas

### 8.1 Funcionalidades Adicionais
- [ ] Definir endereço padrão por profissional
- [ ] Bloquear exclusão de endereço se houver agendas futuras
- [ ] Cálculo de distância do cliente ao endereço
- [ ] Mapa com localização dos endereços

### 8.2 Validações Adicionais
- [ ] Validar formato de CEP (regex)
- [ ] Integração com API de CEP (ViaCEP)
- [ ] Validar duplicação de endereços
- [ ] Limite de endereços por profissional

### 8.3 Relatórios
- [ ] Endereço mais agendado
- [ ] Horários de pico por endereço
- [ ] Taxa de ocupação por local

---

## 9. Testes

### 9.1 Cenários de Teste

**Cenário 1: Profissional com 1 endereço**
```
1. Criar apenas 1 endereço
2. Criar agendas para este endereço
3. Na página pública, pode exibir horários direto (sem seleção de endereço)
```

**Cenário 2: Profissional com múltiplos endereços**
```
1. Criar 2+ endereços
2. Criar agendas para endereço A
3. Criar agendas para endereço B
4. Na página pública, cliente DEVE selecionar endereço primeiro
5. Após seleção, ver apenas horários daquele endereço
```

**Cenário 3: Validação de propriedade**
```
1. Profissional A tenta criar agenda com endereço do Profissional B
2. Sistema deve retornar erro 400 "Address not found or does not belong to you"
```

**Cenário 4: Filtros combinados**
```
1. Buscar horários: userId=X, month=11, addressId=Y
2. Deve retornar apenas horários do mês 11, do endereço Y, do profissional X
```

---

## 10. Arquivos Modificados/Criados

### Modificados:
- `src/app.module.ts` - Adicionado AddressModule
- `src/schedule/schedule.module.ts` - Importado AddressModule
- `src/schedule/schedule.service.ts` - Validação e populate de endereços
- `src/schedule/schedule.controller.ts` - Endpoint público de endereços

### Já Existentes (Completos):
- `src/address/` - Módulo completo de endereços
- `src/schedule/schedule.schema.ts` - Campo address já implementado
- `src/schedule/dto/create-schedule.dto.ts` - Campo address obrigatório
- `src/schedule/dto/public-schedule.dto.ts` - Campo addressId opcional

---

## Conclusão

✅ **Todas as regras solicitadas foram implementadas:**

1. ✅ Profissionais podem ter um ou vários endereços
2. ✅ Cada agenda deve ter um endereço atrelado
3. ✅ Ao criar agenda deve selecionar o endereço
4. ✅ No perfil do profissional existe cadastro de múltiplos endereços
5. ✅ Na página pública, se houver múltiplos endereços, deve selecionar primeiro
6. ✅ Endpoints públicos retornam informações de endereço
7. ✅ Validação de propriedade de endereço ao criar agenda

O sistema está pronto para uso seguindo o padrão NestJS com MongoDB, validações completas e endpoints públicos e autenticados.
