import bcrypt from 'bcrypt';
import postgres from 'postgres';

// Import your placeholder data from the shared data file
import { users, customers, invoices, revenue } from '../lib/placeholder-data'
// Adjust relative path according to your project structure

// Connect to the Postgres database using the connection string /in environment variables
// The SSL 'require' option is common for hosted DBs like Heroku or Supabase
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Seeds the users table:
 * - Creates the table if it doesn't exist
 * - Hashes user passwords before inserting
 * - Inserts user records, skipping conflicts
 */
async function seedUsers(tx: any) {
  await tx`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `;

  for (const user of users) {
    // Hash the plaintext password securely
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await tx`
      INSERT INTO users (id, name, email, password)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

/**
 * Seeds the customers table:
 * - Creates the table if it doesn't exist
 * - Inserts customer records, skipping conflicts
 */
async function seedCustomers(tx: any) {
  await tx`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    )
  `;

  for (const customer of customers) {
    await tx`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

/**
 * Seeds the invoices table:
 * - Creates the table if it doesn't exist
 * - Inserts invoices, linking to customers by customer_id
 */
async function seedInvoices(tx: any) {
  await tx`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    )
  `;

  for (const invoice of invoices) {
    await tx`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

/**
 * Seeds the revenue table:
 * - Creates the table if it doesn't exist
 * - Inserts monthly revenue data, skipping conflicts
 */
async function seedRevenue(tx: any) {
  await tx`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    )
  `;

  for (const rev of revenue) {
    await tx`
      INSERT INTO revenue (month, revenue)
      VALUES (${rev.month}, ${rev.revenue})
      ON CONFLICT (month) DO NOTHING
    `;
  }
}

/**
 * GET API route handler to seed the database.
 * Runs all seeding inside a single transaction.
 * Returns success or error response.
 */
export async function GET() {
  try {
    await sql.begin(async (tx) => {
      // Ensure the uuid-ossp extension exists for UUID generation
      await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

      // Run all seed functions in order inside the transaction
      await seedUsers(tx);
      await seedCustomers(tx);
      await seedInvoices(tx);
      await seedRevenue(tx);
    });

    // Return success response
    return new Response(
      JSON.stringify({ message: 'Database seeded successfully yeahh' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Handle and return errors gracefully
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
