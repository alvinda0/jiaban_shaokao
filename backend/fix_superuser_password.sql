-- Fix superuser password hash
-- Password: superuser123
-- Correct hash: $2b$10$J2zlW.syp2EdlncMQ1a9zOK7VV.CMLfSWOvykbLzpDbBJmCFtDs7S

UPDATE users 
SET password = '$2b$10$J2zlW.syp2EdlncMQ1a9zOK7VV.CMLfSWOvykbLzpDbBJmCFtDs7S'
WHERE email = 'superuser@shaokao.com';

-- Verify the update
SELECT id, email, password FROM users WHERE email = 'superuser@shaokao.com';
