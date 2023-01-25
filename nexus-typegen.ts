/**
 * This file was generated by Nexus Schema
 * Do not make changes to this file directly
 */


import type { Context } from "./src/context"




declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
}

export interface NexusGenEnums {
}

export interface NexusGenScalars {
  String: string
  Int: number
  Float: number
  Boolean: boolean
  ID: string
}

export interface NexusGenObjects {
  AuthPayLoad: { // root type
    token: string; // String!
  }
  Mutation: {};
  Profile: { // root type
    bio?: string | null; // String
    birthday?: string | null; // String
    id: string; // String!
    profilePicture?: string | null; // String
    user: NexusGenRootTypes['User']; // User!
    userId: string; // String!
  }
  Query: {};
  ResponseMessage: { // root type
    response?: string | null; // String
  }
  User: { // root type
    email: string; // String!
    firstName: string; // String!
    id: string; // String!
    kudosNo: number; // Int!
    lastName: string; // String!
    username: string; // String!
    whatsapp: string; // String!
  }
}

export interface NexusGenInterfaces {
}

export interface NexusGenUnions {
}

export type NexusGenRootTypes = NexusGenObjects

export type NexusGenAllTypes = NexusGenRootTypes & NexusGenScalars

export interface NexusGenFieldTypes {
  AuthPayLoad: { // field return type
    token: string; // String!
  }
  Mutation: { // field return type
    changePassword: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
    changePin: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
    signup: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
    updateEmailOrWhatsapp: NexusGenRootTypes['User']; // User!
    updateProfile: NexusGenRootTypes['Profile']; // Profile!
    updateUserFirstAndLastName: NexusGenRootTypes['User']; // User!
  }
  Profile: { // field return type
    bio: string | null; // String
    birthday: string | null; // String
    id: string; // String!
    profilePicture: string | null; // String
    user: NexusGenRootTypes['User']; // User!
    userId: string; // String!
  }
  Query: { // field return type
    getAllUser: NexusGenRootTypes['User'][]; // [User!]!
    getOtp: NexusGenRootTypes['ResponseMessage'] | null; // ResponseMessage
    getProfile: NexusGenRootTypes['Profile'] | null; // Profile
    getUser: NexusGenRootTypes['User'] | null; // User
    login: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
    verifyOtp: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
    verifyPin: NexusGenRootTypes['AuthPayLoad']; // AuthPayLoad!
  }
  ResponseMessage: { // field return type
    response: string | null; // String
  }
  User: { // field return type
    email: string; // String!
    firstName: string; // String!
    id: string; // String!
    kudosNo: number; // Int!
    lastName: string; // String!
    username: string; // String!
    whatsapp: string; // String!
  }
}

export interface NexusGenFieldTypeNames {
  AuthPayLoad: { // field return type name
    token: 'String'
  }
  Mutation: { // field return type name
    changePassword: 'AuthPayLoad'
    changePin: 'AuthPayLoad'
    signup: 'AuthPayLoad'
    updateEmailOrWhatsapp: 'User'
    updateProfile: 'Profile'
    updateUserFirstAndLastName: 'User'
  }
  Profile: { // field return type name
    bio: 'String'
    birthday: 'String'
    id: 'String'
    profilePicture: 'String'
    user: 'User'
    userId: 'String'
  }
  Query: { // field return type name
    getAllUser: 'User'
    getOtp: 'ResponseMessage'
    getProfile: 'Profile'
    getUser: 'User'
    login: 'AuthPayLoad'
    verifyOtp: 'AuthPayLoad'
    verifyPin: 'AuthPayLoad'
  }
  ResponseMessage: { // field return type name
    response: 'String'
  }
  User: { // field return type name
    email: 'String'
    firstName: 'String'
    id: 'String'
    kudosNo: 'Int'
    lastName: 'String'
    username: 'String'
    whatsapp: 'String'
  }
}

export interface NexusGenArgTypes {
  Mutation: {
    changePassword: { // args
      jwtToken: string; // String!
      password: string; // String!
    }
    changePin: { // args
      jwtToken: string; // String!
      pin: string; // String!
    }
    signup: { // args
      id: string; // ID!
      jwtToken: string; // String!
      password: string; // String!
      pin: string; // String!
      username: string; // String!
    }
    updateEmailOrWhatsapp: { // args
      email?: string | null; // String
      jwtToken: string; // String!
      whatsapp?: string | null; // String
    }
    updateProfile: { // args
      bio?: string | null; // String
      birthday?: string | null; // String
      profilePicture?: string | null; // String
    }
    updateUserFirstAndLastName: { // args
      firstName?: string | null; // String
      lastName?: string | null; // String
    }
  }
  Query: {
    getOtp: { // args
      email?: string | null; // String
      whatsapp?: string | null; // String
    }
    getProfile: { // args
      userId?: string | null; // String
      username?: string | null; // String
    }
    getUser: { // args
      id?: string | null; // String
      token?: string | null; // String
      username?: string | null; // String
    }
    login: { // args
      password: string; // String!
      username: string; // String!
    }
    verifyOtp: { // args
      email?: string | null; // String
      otp: string; // String!
      whatsapp?: string | null; // String
    }
    verifyPin: { // args
      pin: string; // String!
      username: string; // String!
    }
  }
}

export interface NexusGenAbstractTypeMembers {
}

export interface NexusGenTypeInterfaces {
}

export type NexusGenObjectNames = keyof NexusGenObjects;

export type NexusGenInputNames = never;

export type NexusGenEnumNames = never;

export type NexusGenInterfaceNames = never;

export type NexusGenScalarNames = keyof NexusGenScalars;

export type NexusGenUnionNames = never;

export type NexusGenObjectsUsingAbstractStrategyIsTypeOf = never;

export type NexusGenAbstractsUsingStrategyResolveType = never;

export type NexusGenFeaturesConfig = {
  abstractTypeStrategies: {
    isTypeOf: false
    resolveType: true
    __typename: false
  }
}

export interface NexusGenTypes {
  context: Context;
  inputTypes: NexusGenInputs;
  rootTypes: NexusGenRootTypes;
  inputTypeShapes: NexusGenInputs & NexusGenEnums & NexusGenScalars;
  argTypes: NexusGenArgTypes;
  fieldTypes: NexusGenFieldTypes;
  fieldTypeNames: NexusGenFieldTypeNames;
  allTypes: NexusGenAllTypes;
  typeInterfaces: NexusGenTypeInterfaces;
  objectNames: NexusGenObjectNames;
  inputNames: NexusGenInputNames;
  enumNames: NexusGenEnumNames;
  interfaceNames: NexusGenInterfaceNames;
  scalarNames: NexusGenScalarNames;
  unionNames: NexusGenUnionNames;
  allInputTypes: NexusGenTypes['inputNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['scalarNames'];
  allOutputTypes: NexusGenTypes['objectNames'] | NexusGenTypes['enumNames'] | NexusGenTypes['unionNames'] | NexusGenTypes['interfaceNames'] | NexusGenTypes['scalarNames'];
  allNamedTypes: NexusGenTypes['allInputTypes'] | NexusGenTypes['allOutputTypes']
  abstractTypes: NexusGenTypes['interfaceNames'] | NexusGenTypes['unionNames'];
  abstractTypeMembers: NexusGenAbstractTypeMembers;
  objectsUsingAbstractStrategyIsTypeOf: NexusGenObjectsUsingAbstractStrategyIsTypeOf;
  abstractsUsingStrategyResolveType: NexusGenAbstractsUsingStrategyResolveType;
  features: NexusGenFeaturesConfig;
}


declare global {
  interface NexusGenPluginTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginInputTypeConfig<TypeName extends string> {
  }
  interface NexusGenPluginFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginInputFieldConfig<TypeName extends string, FieldName extends string> {
  }
  interface NexusGenPluginSchemaConfig {
  }
  interface NexusGenPluginArgConfig {
  }
}