import { API_BASE_URL, ENDPOINTS, buildEndpointUrl } from '../../lib/endpointList';

describe('endpointList', () => {
  it('exposes a base URL string', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('exposes every backend route as a relative path grouped by resource', () => {
    expect(ENDPOINTS).toEqual({
      health: '/health',
      auth: {
        google: '/auth/google',
        me: '/auth/me',
        logout: '/auth/logout',
      },
      round: {
        start: '/api/v1/round',
      },
      diagnoses: {
        submit: '/api/v1/diagnoses',
      },
      game: {
        pause: '/api/v1/game/pause',
        reset: '/api/v1/game/reset',
      },
      day: {
        reset: '/api/v1/day/reset',
        end: '/api/v1/day/end',
      },
      diagnoses: {
        submit: '/api/v1/diagnoses',
      },
      examinations: {
        order: '/api/v1/examinations',
      },
      shop: {
        list: '/api/v1/shop',
        purchase: '/api/v1/shop/purchase',
      },
      inventory: {
        get: '/api/v1/inventory',
        update: '/api/v1/inventory',
      },
    });
  });

  it('builds an absolute URL by joining the base URL with an endpoint path', () => {
    expect(buildEndpointUrl(ENDPOINTS.auth.me)).toBe(`${API_BASE_URL}/auth/me`);
  });
});
