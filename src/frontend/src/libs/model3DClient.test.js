import axios from 'axios';
import { fetchObjModel } from './model3DClient';

jest.mock('axios');

describe('fetchObjModel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests the given url as text and returns the response data', async () => {
    axios.get.mockResolvedValueOnce({ data: 'o Cube\nv 0 0 0\n' });

    const result = await fetchObjModel('/3DModels/FinalBaseMesh.obj');

    expect(axios.get).toHaveBeenCalledWith(
      '/3DModels/FinalBaseMesh.obj',
      expect.objectContaining({
        responseType: 'text',
        transformResponse: [expect.any(Function)],
      })
    );
    expect(result).toBe('o Cube\nv 0 0 0\n');
  });

  it('propagates errors from axios', async () => {
    axios.get.mockRejectedValueOnce(new Error('network error'));

    await expect(fetchObjModel('/3DModels/missing.obj')).rejects.toThrow('network error');
  });
});
