export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  return {
    status: 'success',
    data: {
      message: 'Registration successful',
      user: {
        _id: 'new-user-' + Date.now(),
        // Kept for compatibility with existing dashboard payload consumers; this is a mock-domain ID.
        firebaseId: 'new-mock-user-id-' + Date.now(),
        role: 'customer',
        accountType: 'personal',
        verified: false,
        status: 2,
        contactDetails: {
          firstName: body.firstName || 'New',
          lastName: body.lastName || 'User',
          email: body.email || 'new@example.com',
          phone: body.phone || '+1234567890',
        },
        createdAt: new Date().toISOString(),
      },
    },
  };
});
