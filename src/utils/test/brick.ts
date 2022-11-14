import 'dotenv/config';
import axios from 'axios';
import { BRICK_URI, BRICK_AUTH } from '../brick';
import type { ObjectId } from 'mongodb';
import { access } from 'fs';

interface TokenPayload {
  access_token: string;
}

const getAccessToken = async (): Promise<TokenPayload> => {
  const URI = `${BRICK_URI}/v1/auth/token`;

  const headers = {
    accept: 'application/json',
  };

  try {
    const response = await axios.get(URI, {
      auth: BRICK_AUTH,
      headers,
    });

    const result = await response.data.data;

    if (!result) {
      throw new Error('Data return undefined');
    }

    const { access_token } = result;

    return access_token;
  } catch (e: any) {
    console.error(e);
    throw new Error(
      `Error ${e.response.data.status}! ${e.response.data.error_message}`
    );
  }
};

interface Institution {
  id: number;
  name: string;
  institution_code: string | null | undefined;
  country_code: 'ID' | 'SG';
  country_name: 'Indonesia' | 'Singapore';
  primary_color: string;
  created_at: Date | null;
  updated_at: Date | null;
  channels?: null;
  is_ocr_active: boolean;
  automatic_verification: boolean;
  pdf_verification: boolean;
  passbook_verification: boolean;
  institution_type:
    | 'Investment'
    | 'Employment Data'
    | 'Mobile Banking'
    | 'Internet Banking'
    | 'E-Wallet'
    | 'E-Commerce'
    | 'Corporate Banking';
}

const getInstitutionList = async (
  access_token: TokenPayload
): Promise<Institution[]> => {
  if (access_token === null) {
    throw new Error('Access Token is null');
  }

  const URI = `${BRICK_URI}/v1/institution/list`;

  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    };

    const response = await axios.get(URI, {
      headers,
    });

    const institutionList = response.data.data;

    return institutionList;
  } catch (e: any) {
    console.error(e);
    throw new Error(
      `Error ${e.response.data.status}! ${e.response.data.error_message}`
    );
  }
};

interface WidgetPayload {
  clientId: string;
  redirectRefId: string;
}

const getClientIdAndRedirectRefId = async (
  access_token: TokenPayload,
  userId: ObjectId
): Promise<WidgetPayload> => {
  const URI = `${BRICK_URI}/v1/auth/token`;

  const redirectUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://app.kudoku.id/api/brick'
      : 'http://127.0.0.1:5173/api/brick';

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: `Bearer ${access_token}`,
  };

  const body = {
    accessToken: access_token,
    userId: userId as unknown as string,
    redirectUrl,
  };

  try {
    const response = await axios.post(URI, body, {
      headers,
    });

    const result = await response.data.data;

    if (!result) {
      throw new Error('Data return undefined');
    }

    const { clientId, redirectRefId } = result;

    return {
      clientId,
      redirectRefId,
    };
  } catch (e: any) {
    console.error(e);
    throw new Error(
      `Error ${e.response.data.status}! ${e.response.data.error_message}`
    );
  }
};

interface UserBankData {
  username: string;
  password: string;
}

interface UserTokenPayload {
  userAccessToken: string;
  accountId: string;
  bankId: number;
}

const generateUserAccessToken = async (
  access_token: TokenPayload,
  widgetData: WidgetPayload,
  institutionId: number,
  userData: UserBankData
): Promise<UserTokenPayload> => {
  const URI = `${BRICK_URI}/v1/auth/${widgetData.clientId}`;

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    Authorization: `Bearer ${access_token}`,
  };

  const body = {
    institutionId,
    username: userData.username,
    password: userData.password,
    redirectRefId: widgetData.redirectRefId,
  };

  try {
    const response = await axios.post(URI, body, {
      headers,
    });

    const result = await response.data.data;

    if (!result) {
      throw new Error('Data return undefined');
    }

    const { accessToken: userAccessToken, ubc_id: accountId, bankId } = result;

    return {
      userAccessToken,
      accountId,
      bankId,
    };
  } catch (e: any) {
    console.error(e);
    throw new Error(
      `Error ${e.response.data.status}! ${e.response.data.error_message}`
    );
  }
};

const bankAccountInfo = async (
  access_token: TokenPayload,
  userAccessToken: UserTokenPayload['userAccessToken'],
  accountId: string
) => {
  if (userAccessToken === null || accountId === null) {
    throw new Error('Access Token or account id is null');
  }

  const URI = `${BRICK_URI}/v1/account/detail?accountId=${accountId}`;

  try {
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${access_token}`,
      Authorization: userAccessToken as unknown as string,
    };

    const response = await axios.get(URI, {
      headers,
    });

    // const result = await response.data.data;

    // if (!result) {
    // 	throw new Error("Data return undefined");
    // }

    // const { accessToken } = result;

    return response;
  } catch (e: any) {
    console.error(e);
    throw new Error(
      `Error ${e.response.data.status}! ${e.response.data.error_message}`
    );
  }
};

// (async function main() {
// 	const access_token = await getToken();

// 	const response = await getUserAccessToken(access_token);

// 	// const redirect_url = "http://127.0.0.1:5173/api/brick";

// 	// const URI = `https://cdn.onebrick.io/sandbox-widget/v1/?accessToken=${access_token}&redirect_url=${redirect_url}&lang=bahasa`;

// 	// const URI = `https://cdn.onebrick.io/sandbox-widget/v1/?accessToken=${access_token}&lang=bahasa`;

// 	// const response = await getInstitutionList(access_token);

// 	// const response = await axios.get(URI);

// 	// const user_access_token =
// 	// 	"access-sandbox-a2c56a90-d5ac-4636-ag5d-f021d1dc826s"; // after brick widget

// 	// const accountId = "1234"; //after brick widget

// 	// const response = await bankAccountInfo(user_access_token, accountId);

// 	console.log(response);

// const access_token = await getToken();

// I use my ObjectId USer MongoDB as my userId

// const userId = "asd" as unknown as ObjectId;

// const widgetData = await getClientIdAndRedirectRefId(access_token, userId);

// For mock bank, institution id = 45

// const userData = {
// 	username: "paseksujana123",
// 	password: "Pasek123",
// };

// const response = await generateUserAccessToken(
// 	access_token,
// 	widgetData,
// 	45,
// 	userData
// );
// })();

(async function main() {
  const access_token = await getAccessToken();

  const userId = 'Furqon' as unknown as ObjectId;

  const { clientId, redirectRefId } = await getClientIdAndRedirectRefId(
    access_token,
    userId
  );

  const widgetData = { clientId, redirectRefId };

  const userData = {
    username: 'paseksujana123',
    password: 'Pasek123',
  };

  const { userAccessToken, accountId, bankId } = await generateUserAccessToken(
    access_token,
    widgetData,
    45,
    userData
  );

  const response = await bankAccountInfo(
    access_token,
    userAccessToken,
    accountId
  );

  console.log(response);
  // console.log("2", widgetData);
  // console.log("3", response);
})();
